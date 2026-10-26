# Admin V2 — local implementation

## Access and pages

`/admin` has Overview, ML Decision Explorer / Inspector, Model Comparison Lab, Prediction Quality, Model Registry, System Health & Audit, and Users sections. Every `/api/admin/*` route retains verified Firebase JWT authentication and the server-side requirement for the verified `abishekvh@gmail.com` identity plus the `arckivAdmin: true` custom claim. No account grants or cloud settings were changed for V2.

Guide was removed from the navigation array (desktop and mobile). Its route and documentation remain intact.

## Data and decision semantics

New Mongoose model `MlInferenceLog` uses collection `mlInferenceLogs`. It stores IDs, filename/MIME, timestamps, model/algorithm/estimator/preprocessing identifiers, evaluation report hash, actual returned scores and score type, confidence and threshold, accepted/fallback/final-source flags, category, stage timings, sanitized error codes, and status. It never stores extracted text, document bytes, summaries, tokens, keys or provider error payloads.

The existing pipeline remains **Gemini extraction → optional local PDF text extraction → Logistic Regression classification → final category**. Gemini has already run when the ML confidence gate executes. `geminiFallback` means a successful Gemini category was retained; it does not mean a second Gemini call was made. A failed Gemini request with no accepted ML prediction uses `default`, not a successful fallback.

FastAPI exposes `predict_proba` category probabilities for the unchanged V2 artifact. If a different estimator exposes only decision margins, those margins are labelled as such, with its existing sigmoid/softmax confidence calculation identified separately. An estimator with no scoring method returns unavailable confidence, never invented 100% certainty. Rejected predictions retain their available model/scores in monitoring. Unavailable values remain null/empty.

Monitoring writes occur outside the upload transaction and are bounded to 750 ms. A rejected/stalled write logs `ML_MONITORING_WRITE_FAILED` and does not break a successful upload. This is best-effort monitoring, not a durable queue: database outages can produce gaps. New records only; no fictional backfill of historic confidence/scores. Metadata logs remain for audit after a document is deleted; define a retention policy before long-term use.

## APIs

All admin list APIs paginate (default 20, maximum 100; bounded page number). Aggregations execute in MongoDB, not by loading collections into application memory.

- `GET /api/admin/overview?page=1` — existing paginated users and document counts, preserved.
- `GET /api/admin/inferences?page=1&limit=20&q=invoice&from=2026-10-01&to=2026-10-26&category=Invoice&source=ml&status=completed&model=...&minConfidence=0.45&maxConfidence=1` — escaped literal filename search and validated filters; dates use UTC.
- `GET /api/admin/inferences/:id` — metadata-only inspector with scores, timeline and error codes.
- `GET /api/admin/analytics` — current document/user totals, all-time recorded inference metrics, last-30-day UTC charts, recent events and existing service health probe.
- `GET /api/admin/quality?page=1&limit=20` — latest category review per document, correction distributions and monthly trends.
- `GET /api/admin/registry` — curated existing report metadata plus a restricted health summary; no arbitrary artifact-file endpoint.
- `POST /api/documents/:id/category-review` with `{ "category": "Invoice" }` — owner-only explicit confirmation, exposed in Summary. Stale category returns 409. No category is changed by confirmation.

## Metric definitions

- Registered users are **Arckiv users synced to MongoDB**, not unrelated accounts in the shared Firebase project.
- ML attempts exclude disabled, no-text and not-run decisions. Acceptance = accepted / attempts.
- Gemini fallback rate = successful Gemini-selected classifications / all recorded uploads.
- Failed classifications = failed upload or no final classifier (`default`/`other`). Model request failures and extraction failures are also counted separately on Health.
- Total processing latency covers monitored upload processing through database save, before the monitoring write; inference latency covers the classifier service call/decision. Background embeddings are excluded.
- Category totals use current documents, including manual edits. Inference-source charts use immutable upload decisions.
- Correction tracking extends existing `DocumentHistory` edit metadata; `CATEGORY_REVIEW` records explicit confirmations. Only the latest review per document is used, preventing repeat reviews from inflating agreement. Legacy edits without original prediction provenance cannot establish agreement.
- User feedback is **not verified ground truth**. Production accuracy is null; agreement is calculated only where an original prediction exists. No ground-truth labeling workflow is claimed.
- Daily upload charts represent currently stored documents; deleted documents are not reconstructed. Model trends cap grouped results at 300, correction categories at 30, correction trend groups at 36, and recent events at 10.

## Registry and comparison evidence

`server/scripts/buildModelRegistry.py` reads current V2, archived V1 and experimental DocLayNet evaluation reports into the content-only `server/src/data/modelRegistry.json`. Original report SHA-256 identifiers provide provenance; row-level training/evaluation records are excluded. No reports or artifacts are overwritten, and no training runs.

V2 validation Logistic Regression and Linear SVM scores tie. `ml/train_v2.py:259-260` explicitly retains Logistic Regression for probability-based confidence gating. There is no dynamic algorithm competition. Benchmark splits and sample sizes are displayed separately; absent dates/metrics remain unavailable. Offline metrics never become production accuracy. Runtime service identity is distinguished from configured deployment status.

## Future deployment / database steps (not executed)

1. Review local changes. If evaluation reports change, run `python3 server/scripts/buildModelRegistry.py` from the Arckiv root and inspect the generated metadata.
2. Deploy Express and FastAPI together when authorized; the score fields are additive, so older FastAPI responses display scores as unavailable. Keep the current artifact and threshold.
3. Deploy the frontend when authorized. No new frontend/backend dependencies or cloud configuration are required.
4. Mongoose creates `mlInferenceLogs` on first write. Create its declared indexes and the added history indexes via the normal index-management process. `createIndexes()` on these models is additive; do not use destructive `syncIndexes()` blindly. If automatic indexing is disabled, an operator must create them before enabling high-volume use.
5. No data migration or backfill is required. Historical monitoring starts empty. Existing authentication claims remain sufficient.

Browser verification, production service tests, deployment, GitHub push and Atlas network changes were intentionally not performed for this task.
