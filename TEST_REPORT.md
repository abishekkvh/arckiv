# Deployment verification — 24 October 2026 (IST)

## Current deployment

- Firebase Hosting published: https://arckiv-whatsapp-8fbf7.web.app
- Render Free Docker API: https://arckiv-api.onrender.com
- Atlas connection and ping succeeded; public health confirms the database is connected.
- FastAPI runs privately inside the same container. Public health confirms model `arckiv-v2-logistic_regression-f0f7e2d35969`, threshold **0.45**.
- Firebase Auth domain added with explicit owner approval; all existing domains preserved.
- Public GitHub repository: https://github.com/abishekkvh/arckiv . Source was scanned before publication; secrets, user uploads and training data are excluded.
- No paid resources or billing changes.

## Completed checks

**14 public API checks passed**, with real Firebase JWTs, Atlas/GridFS, Gemini and V2:

1. Public health and exact V2 identity/threshold.
2. Firebase authentication/account sync for two synthetic users.
3. Live Gemini extraction.
4. Accepted V2 invoice classification through the deployed upload API.
5. Authenticated PDF preview/download response headers and byte-for-byte originals.
6. Anonymous and cross-user restrictions.
7. Keyword search.
8. Live Gemini document chat.
9. Share preview, download permission restriction and revocation.
10. Share download and expiration.
11. Real low-confidence prediction retaining Gemini fallback.
12. Production CORS restrictions.
13. Atlas GridFS existence and exact stored-file checksum.
14. Document deletion and original removal.

All synthetic API test accounts and documents were cleaned up. The first synthetic invoice was below the threshold; its expected-ML assertion failed because it correctly fell back. A representative synthetic invoice subsequently verified the accepted path. The model and threshold were not changed to pass tests.

Also verified: frontend and deep route return HTTP 200 with the same SPA document; React production build; local backend suite (27 passed, 1 live suite intentionally skipped); Python ML suite (19 passed); real ML local integration (6 passed with mocked Gemini); npm audit zero findings after dependency patches.

The initial Render build exposed a lockfile entry missing under npm 10. The repaired lockfile and patched body-parser passed clean installation and regression tests; Render subsequently deployed successfully. Prior Gemini quota exhaustion was transient; extraction and chat both passed in the current public tests.

## Final checks in progress

A synthetic original is being retained across a real redeploy to verify persistence after process replacement. Browser sign-in/upload/preview verification is in progress. Safari initially blocked a popup after an asynchronous persistence-setting call; persistence has now moved to Firebase initialization and the frontend is being republished for retest.

## Limits

Stored evaluation reports are not independent production accuracy guarantees. Render cold starts and shared free hours apply; Atlas storage is capped; Gemini quotas can interrupt AI features. Vector search is disabled pending index configuration. Existing lint warnings and a roughly 559 KB frontend chunk warning remain nonblocking. Browser-only checks are not counted as passed unless confirmed below.

V2 artifact SHA256: `49db9c6d64bead6ced4264e5150790b48eb46c7de18393132179f8918035b8bf`.
