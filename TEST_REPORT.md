# Arckiv resumed deployment verification — 24 October 2026 (IST)

## Release status

**Not yet publicly deployed.** Do not describe this as a production pass.

- Firebase project `whatsapp-8fbf7`: authenticated CLI access verified.
- Separate site **arckiv-whatsapp-8fbf7** created successfully; local target `arckiv` configured in `.firebaserc`.
- Reserved URL: https://arckiv-whatsapp-8fbf7.web.app — no application release uploaded.
- Existing default Hosting site (Orbit) was not overwritten.
- Render dashboard accessible; existing project `arckiv` has no active services. No backend URL allocated.
- Atlas: configured cluster hostname fails DNS (`ENOTFOUND`); Google sign-in remains stuck at the Atlas callback. No cloud DB connection verified. Existing local MongoDB works.
- Source-only deployment package exists locally. A private GitHub upload to `abishekkvh/arckiv` was rejected by automatic approval review: explicit consent to transmit source code and model artifact to this destination is required. No push occurred; no workaround attempted.
- No billing enabled, paid resource created, credential rotated or existing user data migrated.

## Tests actually executed

| Check | Result and scope |
| --- | --- |
| React production build | Pass after final UI changes; Vite 8.3.5. Main chunk ~559 KB warning remains. |
| Frontend lint | Exit 0; existing unused imports and hook-dependency warnings remain. |
| Frontend npm audit | 0 vulnerabilities after pinning patched `@grpc/grpc-js` 1.14.6. No Firebase downgrade. |
| Backend production npm audit | 0 vulnerabilities. |
| Final backend `RUN_INTEGRATION=true npm test` | 27 passed, 1 intentionally skipped live ML suite, 0 failures. |
| FastAPI pytest | 19 passed; one TestClient deprecation warning. |
| V2 HTTP/Express/GridFS integration | 6 passed with real current FastAPI and local MongoDB; **Gemini metadata and authentication mocked in this test only**. Covers accepted invoice prediction, persisted V2 model ID, manual correction, valid low-confidence PDF and preserving fallback category. |
| Real Firebase smoke | Temporary account login, JWT validation and account sync passed. Test account cleaned up. |
| Real Gemini extraction | Synthetic invoice extraction passed; upload took ~4 seconds. |
| Real GridFS retrieval | Authenticated original retrieval passed. |
| Real Gemini chat | **Blocked/failing: provider returned HTTP 429 daily free quota exhausted (20 requests/day for this key/model at test time).** No billing change made. |
| Quota handling regression | Service preserves status 429; API returns useful quota message; frontend displays it. Regression tests pass. |
| Isolation/share/delete | Local isolated integration passes unauthorized access, cross-user restrictions, sharing permissions, expiration, revocation, literal search, deletion cascade and stored-file cleanup. Auth/AI doubles are explicitly test-only. |
| Persistence | Local GridFS survives DB disconnect/reconnect in tests. Cloud/backend-restart persistence not yet verified. |
| Combined deployment supervisor | Started FastAPI on 8011 and Express on 5002; production `/health` returned database connected, required classifier ready, exact V2 ID and threshold 0.45. Temporary supervisor shut down; existing app services preserved. |
| Linux dependencies | All pinned serving wheels resolved/downloaded for Python 3.13 x86_64 and Debian Bookworm-compatible manylinux ABIs. Docker build itself was not run (Docker unavailable). |
| Public/browser end-to-end | **Not run:** no public backend or application deployment. Sign-out, browser PDF preview/download and deployed search/chat/share/delete still require final browser verification. |

An initial non-escalated ML test could not connect to local MongoDB (sandbox EPERM). The subsequent authorized network-enabled run passed. It is not counted as a product failure.

## V2 preservation

- Artifact: `ml/artifacts/classifier.joblib`
- SHA256: `49db9c6d64bead6ced4264e5150790b48eb46c7de18393132179f8918035b8bf`
- Model ID: `arckiv-v2-logistic_regression-f0f7e2d35969`
- sklearn: `1.9.1`; threshold: **0.45**; labels: Invoice, Receipt, Certificate, Report.
- No retraining or artifact replacement. Training configuration was not silently changed.
- Supervisor validates artifact checksum and model ID. Express rejects unexpected model IDs and invalid confidence values.
- Saved evaluation reports were inspected, not independently validated as production accuracy. The independent benchmark uses hardcoded texts and its provenance has not been established; no accuracy guarantee is made.

## Deployment design and limitations

One free Render Docker web service runs Express publicly and FastAPI on private loopback. This avoids a second service's cold-start timeout and extra use of shared free instance hours. GridFS supplies persistent originals; Render's local filesystem remains temporary. Runtime readiness requires both database and expected V2 model.

The local idle supervisor/ML/Node processes used approximately 140 MB RSS combined. This is not a Linux peak-memory or Render load-test guarantee. AI concurrency is limited to one in Render. Optional high-resolution PyMuPDF rendering is absent from the inference-only image; chat falls back to original PDF and extracted text.

Free Render sleeps after inactivity and workspace hours are shared with other services. Atlas free storage is limited. Gemini quotas can block extraction/chat; saved files remain available. These are demo constraints, not an always-on production SLA.

Sources: https://render.com/docs/free ; https://render.com/docs/docker ; https://firebase.google.com/docs/hosting/usage-quotas-pricing ; https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
