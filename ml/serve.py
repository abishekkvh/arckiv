"""Serve the production document classifier on localhost (port 8001 by default)."""
import argparse
import os
from pathlib import Path
import sys

import uvicorn

ML_DIR = Path(__file__).resolve().parent
if str(ML_DIR) not in sys.path:
    sys.path.insert(0, str(ML_DIR))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Serve the Arckiv ML Document Classifier")
    parser.add_argument("--model", default=str(Path(__file__).parent / "artifacts/classifier.joblib"))
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    model = Path(args.model).resolve()
    if not model.is_file():
        parser.error(f"Model artifact does not exist at {model}. Please run train_production.py first.")

    os.environ["CLASSIFIER_MODEL_PATH"] = str(model)
    print(f"Starting Arckiv Production ML Classifier on http://{args.host}:{args.port}")
    print(f"Loaded Model: {model}")
    uvicorn.run("app:app", host=args.host, port=args.port)
