# Finish Arckiv deployment

All existing work and the current V2 model are preserved. Read `TEST_REPORT.md` for what passed and what remains unverified.

## Remaining inputs

1. **Approve the private GitHub upload** of Arckiv source + V2 artifact to `abishekkvh/arckiv`. Automatic review blocked it until explicit approval. `deployment-package/` is ready locally; it contains no `.env` secrets, uploaded documents, training data or test PDFs. Do not push the outer College repository.
2. **Complete Atlas sign-in and obtain a working connection URI.** The saved hostname does not resolve. Reuse an existing free cluster when possible. If a database password must be created/reset, complete that yourself; do not paste credentials into chat. Configure only the Render service's documented outbound ranges in Atlas Network Access, with appropriate approval for that access change.
3. **Use existing Arckiv project in Render.** After approved source publication, connect the private repository, select Free Docker service, Dockerfile `./Dockerfile`, root context, health `/health`. Use `render.yaml` and `deploy/.env.example`. Reuse the current Firebase Admin/Gemini secrets from `server/.env` through Render's secure environment settings. Replace only the Atlas URI and production frontend origin as needed. No paid disk, worker, database or second ML service is required.
4. **Wait for backend health.** It must report `status: ok`, database connected, and V2 ID `arckiv-v2-logistic_regression-f0f7e2d35969`. Record the actual Render URL; do not guess it.
5. **Deploy frontend.** The separate Hosting site and target already exist. From the original `arckiv` directory:
   ```sh
   VITE_API_URL=https://ACTUAL_RENDER_HOST.onrender.com firebase deploy --only hosting:arckiv --project whatsapp-8fbf7 --account abishekvh@gmail.com
   ```
   Existing client Firebase config stays in `client/.env.local`. The predeploy script checks the backend and builds the frontend. Add `arckiv-whatsapp-8fbf7.web.app` to Firebase Auth authorized domains if needed, preserving existing entries; this account setting needs approval if performed by an agent.
6. **Final public verification.** Open https://arckiv-whatsapp-8fbf7.web.app only after publication. Test Google sign-in/out, synthetic PDF upload, extraction, V2 classification, preview/download, search, chat, share/revoke/delete, refresh on a deep route, and retrieval after a Render restart. Repeat live Gemini tests only after quota resets. Current key hit its daily quota; no paid upgrade is necessary or authorized.

See `DEPLOYMENT.md` for future redeploy commands. Real production URLs and Atlas status must be recorded after these steps; they cannot truthfully be supplied yet.
