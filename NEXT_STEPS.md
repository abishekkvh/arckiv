# Finish the existing Arckiv deployment

## Created — reuse these resources

- Public repository: https://github.com/abishekkvh/arckiv (`main`)
- Free Render Docker service: https://dashboard.render.com/web/srv-dbdvsgfavr4c739jqdlg
- Allocated API URL: https://arckiv-api.onrender.com (not yet healthy)
- Firebase Hosting site: https://arckiv-whatsapp-8fbf7.web.app (no app release published)
- Firebase project: `whatsapp-8fbf7`; Hosting target: `arckiv`

Do not create duplicate services or enable billing. V2 artifact and threshold 0.45 remain unchanged.

## Remaining blockers

1. Complete Atlas sign-in and replace `MONGODB_ATLAS` in local `server/.env` with the working cluster URI. The current hostname fails DNS. Do not send credentials in chat. If a password must be reset, complete that yourself.
2. Approve transfer of existing `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `GEMINI_API_KEY` and the corrected Atlas URI into **Render arckiv-api secure environment settings**, or enter them yourself at https://dashboard.render.com/web/srv-dbdvsgfavr4c739jqdlg/env . Set Render `MONGODB_URI` to the corrected Atlas URI. Automatic approval review blocked the credential import pending explicit approval; nothing secret was transferred.
3. Approve/configure Atlas network access for the Render service's shared outbound CIDRs: `74.220.48.0/24`, `74.220.56.0/24`. No network-access changes have been made. Recheck these ranges in Render Connect before use.
4. Wait for Render to deploy successfully. The first cloud build failed because npm 10 required a missing lockfile entry; the repaired lockfile was validated with a clean npm 10 production install. Public health must return `status: ok`, database connected, and V2 model `arckiv-v2-logistic_regression-f0f7e2d35969`.
5. From the original `arckiv` directory, publish the frontend only after API health passes:

   ```sh
   VITE_API_URL=https://arckiv-api.onrender.com firebase deploy --only hosting:arckiv --project whatsapp-8fbf7 --account abishekvh@gmail.com
   ```

   `client/.env.production` now contains the actual API origin. Existing Firebase client configuration remains in `.env.local`. Never put server secrets into VITE variables.
6. Confirm `arckiv-whatsapp-8fbf7.web.app` is an authorized Firebase Auth domain. Adding it is an account setting requiring approval if performed by an agent.
7. Test the public app: Google sign-in/out, PDF upload, extraction, V2 classification, fallback, preview/download, search, chat, sharing/revocation/deletion, deep-route refresh, and retrieval after a Render restart. Prior live Gemini chat reached the free daily quota; repeat once quota is available. No paid upgrade is authorized.

The Render dashboard is configured for automatic deploys on commits to `main`. See `DEPLOYMENT.md` for update commands. Public end-to-end tests remain unverified until the above blockers are resolved.
