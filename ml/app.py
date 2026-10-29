from contextlib import asynccontextmanager
import os
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator


class PredictionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100000)

    @field_validator("text")
    @classmethod
    def not_blank(cls, value):
        if not value.strip():
            raise ValueError("Text must not be blank")
        return value


def create_app(model_path=None):
    path = Path(model_path or os.environ.get(
        "CLASSIFIER_MODEL_PATH", str(Path(__file__).parent / "artifacts/classifier.joblib")
    ))

    @asynccontextmanager
    async def lifespan(app):
        app.state.bundle = joblib.load(path) if path.exists() else None
        if app.state.bundle is not None:
            bundle = app.state.bundle
            if not isinstance(bundle, dict) or not {"pipeline", "metadata"} <= bundle.keys():
                raise RuntimeError("Invalid classifier artifact")
            if bundle["metadata"].get("experimental") and os.environ.get("ALLOW_EXPERIMENTAL_MODEL") != "true":
                raise RuntimeError("Experimental artifact requires ALLOW_EXPERIMENTAL_MODEL=true on an isolated service")
        yield

    app = FastAPI(title="Arckiv document classifier", lifespan=lifespan)

    @app.get("/health")
    def health():
        bundle = app.state.bundle
        return {"ready": bundle is not None, "model": bundle["metadata"] if bundle else None}

    @app.post("/predict")
    def predict(request: PredictionRequest):
        bundle = app.state.bundle
        if bundle is None:
            raise HTTPException(503, "Train a model, then restart the classifier service")
        pipeline = bundle["pipeline"]
        # An all-zero vector has no vocabulary overlap; do not guess from an intercept.
        if pipeline[:-1].transform([request.text]).nnz == 0:
            return {"category": None, "confidence": 0.0, "reason": "no_known_terms", **bundle["metadata"]}
        
        category_scores = {}
        score_type = None
        confidence_method = None
        # Preserve existing decision behavior; expose the actual underlying scores.
        if hasattr(pipeline, "predict_proba"):
            probs = pipeline.predict_proba([request.text])[0]
            classes = list(pipeline.classes_)
            category_scores = {str(label): float(value) for label, value in zip(classes, probs)}
            score_type = "probability"
            confidence_method = "predict_proba"
            best_idx = int(np.argmax(probs))
            category = str(classes[best_idx])
            confidence = float(probs[best_idx])
        elif hasattr(pipeline, "decision_function"):
            scores = np.asarray(pipeline.decision_function([request.text])[0])
            score_type = "decision_margin"
            if scores.ndim == 0:
                category_scores = {str(pipeline.classes_[1]): float(scores)}
                confidence_method = "sigmoid_decision_margin"
                prob = 1.0 / (1.0 + np.exp(-scores))
                confidence = float(max(prob, 1.0 - prob))
                category = str(pipeline.classes_[int(scores > 0)])
            else:
                category_scores = {str(label): float(value) for label, value in zip(pipeline.classes_, scores)}
                confidence_method = "softmax_decision_margin"
                exp_scores = np.exp(scores - np.max(scores))
                probs = exp_scores / np.sum(exp_scores)
                best_idx = int(np.argmax(probs))
                category = str(pipeline.classes_[best_idx])
                confidence = float(probs[best_idx])
        else:
            category = str(pipeline.predict([request.text])[0])
            confidence = None  # No score API: do not invent certainty.

        return {
            "category": category,
            "confidence": confidence,  # Preserve the exact probability for threshold decisions and logging.
            **bundle["metadata"],
            "scores": category_scores,
            "score_type": score_type,
            "confidence_method": confidence_method,
            "estimator_class": type(pipeline.steps[-1][1]).__name__,
        }

    return app


app = create_app()
