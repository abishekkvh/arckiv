# Arckiv — AI-Powered Document Management

**Live app:** https://arckiv-whatsapp-8fbf7.web.app  
**API health:** https://arckiv-api.onrender.com/health

React, Firebase Authentication, Express, MongoDB GridFS, Gemini extraction/chat,
and a private FastAPI/scikit-learn V2 classifier.

One free Render Docker service runs Express and ML inference; Firebase Hosting serves the frontend. The V2 model is preserved at confidence threshold **0.45**, with a deployment checksum and no automatic retraining. Files are served through authenticated or expiring share-token endpoints.

- [Deployment and redeploy commands](DEPLOYMENT.md)
- [Actual test results and limitations](TEST_REPORT.md)
- [Production environment checklist](deploy/.env.example)
- [V2 model manifest](deploy/model-manifest.json)

This source-only deployment checkout excludes credentials, user documents, training datasets, local dependencies and test fixtures. Free services can sleep and AI quotas apply; keyword search is available without an Atlas vector index.
