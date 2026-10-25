# Arckiv deployment

- Frontend: https://arckiv.web.app
- API: https://arckiv-api.onrender.com
- Repository: https://github.com/abishekkvh/arckiv
- Render dashboard: https://dashboard.render.com/web/srv-dbdvsgfavr4c739jqdlg
- Firebase project: `whatsapp-8fbf7`, target `arckiv` (separate from the existing Orbit site).

## Architecture

Firebase Hosting serves React. One **Free** Render Docker service runs Express and private FastAPI on container loopback. The supervisor verifies the current V2 artifact checksum and model ID before starting Express. Threshold remains **0.45**; deployments do not retrain the model. `/health` checks Atlas and the expected classifier and reports the deployed revision.

Atlas Free stores document metadata and originals in GridFS. Authentication uses the existing Firebase project. Gemini handles extraction and chat, with bounded deadlines and a saved-file fallback when AI is unavailable. FastAPI has no public inference URL.

Secrets are stored only in Render environment settings and excluded local environment files. Use `deploy/.env.example` as a checklist. Do not commit real credentials. `client/.env.production` contains the public API origin; Firebase public client config is in `client/.env.local`. Never put Gemini or Firebase Admin secrets into VITE variables.

## Redeploy updates

From the original `arckiv` working directory:

```sh
python3 server/scripts/packageDeployment.py
cd deployment-package
git add -A
git commit -m "Update Arckiv"
git push origin main
cd ..
```

Render automatically builds the connected `main` branch. Wait until the new revision is healthy:

```sh
curl --fail https://arckiv-api.onrender.com/health
```

Then deploy the frontend (the predeploy script checks health and builds it):

```sh
VITE_API_URL=https://arckiv-api.onrender.com firebase deploy --only hosting:arckiv --project whatsapp-8fbf7 --account abishekvh@gmail.com
```

For a frontend-only update, the Firebase command is sufficient to publish the build; also push source changes to GitHub for version control. Do not recreate the existing Hosting site or Render service.

## Verification

From the original working tree:

```sh
cd server
RUN_INTEGRATION=true npm test
node scripts/publicSmoke.js
cd ../ml
.venv/bin/python -m pytest -q
cd ../client
npm run build
npm run lint
```

`publicSmoke.js` creates two synthetic Firebase accounts and synthetic PDFs against the deployed API and cleans up only its own test records. It consumes Gemini free quota. Tests/datasets are excluded from the deployment checkout; run the commands in the original working tree.

## Free-tier limits

Render sleeps after idle periods; the first request can take a minute or longer. Its free instance hours are shared across the workspace. Atlas free storage is limited to 0.5 GB including indexes. Gemini has per-project/model quotas: quota exhaustion can disable extraction/chat until reset. Keyword search is enabled; Atlas vector search remains disabled pending an index. Optional high-resolution PyMuPDF rendering is absent in the serving image; Gemini receives the original PDF and extracted text.

No billing was enabled. This is a free demonstration deployment, not an always-on SLA.

Official limits: [Render Free](https://render.com/docs/free), [Firebase Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing), [Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
