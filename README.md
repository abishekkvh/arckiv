# Arckiv — AI-Powered Document Management

React document manager with Firebase Authentication, Express, MongoDB GridFS,
Gemini extraction/chat, and a FastAPI/scikit-learn V2 classifier.

## Deployment

This repository is the deployment checkout. Firebase Hosting serves the frontend;
a single free Render Docker service runs Express and private FastAPI inference.
Original documents are protected by authenticated endpoints and stored in GridFS.

- `Dockerfile` and `render.yaml`: backend + ML runtime
- `deploy/.env.example`: production environment checklist (no real secrets)
- `deploy/model-manifest.json`: preserved V2 checksum and model ID
- `DEPLOYMENT.md`: setup and redeploy commands
- `TEST_REPORT.md`: test scope and outstanding cloud verification

The model is preserved at confidence threshold **0.45**. Deployment never retrains it.
No credentials, uploaded user documents, training datasets or local dependencies
are included. Runtime dependency versions are pinned in lockfiles.

The reserved Firebase site is `arckiv-whatsapp-8fbf7.web.app`.
A reserved site does not mean a working release has been published: check the
current deployment report for backend/database readiness.
