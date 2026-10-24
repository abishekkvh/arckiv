# Arckiv: Firebase Hosting + free Express + ML V2 backend

Firebase project: `whatsapp-8fbf7`. Use a separate Hosting site for Arckiv so the existing Orbit app is not overwritten.

## Architecture

- Firebase Hosting Spark: React frontend and HTTPS.
- Firebase Authentication: existing Google sign-in.
- Render Free web service: one Docker service running Express (Node 22) and private FastAPI (Python 3.13).
- MongoDB Atlas Free: metadata and private originals in GridFS. Free storage is limited to 0.5 GB, including indexes.
- Gemini: existing API key; availability and quotas depend on that key's project. Uploads still save when AI is unavailable.

Firebase Cloud Run / App Hosting require billing. This setup does not enable Firebase billing. Render Free sleeps after 15 idle minutes; the first request can take about a minute. It is suitable for a college demo, not an always-on production SLA.

## Backend

1. Make an Atlas Free cluster and a database user restricted to the `arckiv` database. Allow the backend's outbound IP ranges in Atlas Network Access. Do not expose the database to every IP unless you understand and accept that choice.
2. Push only `deployment-package/` to a private GitHub repository; `python3 server/scripts/packageDeployment.py` prepares it. This excludes credentials, uploaded documents, backups, training data, and local dependencies.
3. Connect that repository in Render. Create a **Free Docker** web service using `render.yaml`. Dockerfile is `./Dockerfile`, context is repository root, health path is `/health`. Do not set root directory to `server`.
4. Set the secret variables from `server/.env.example` in Render's environment settings. Use a working Atlas URI (database `arckiv`), not the localhost URI. Set `FILE_STORAGE=gridfs`, `NODE_ENV=production`, and `CLIENT_URL` to the exact Firebase Hosting origin. Keep `ENABLE_VECTOR_SEARCH=false` unless an Atlas vector index has been configured.
5. Confirm `https://YOUR-API.onrender.com/health` returns `{"status":"ok"}`.

The optional Python high-resolution PDF renderer falls back to the original PDF if Python/PyMuPDF is unavailable. The deployment requires the current V2 model; the supervisor verifies its SHA256 and model ID before starting Express. FastAPI listens only on container loopback and has no public inference URL. This localhost URL is intentional internal communication, not a frontend production dependency. Threshold stays 0.45. No training runs during deployment.

## Frontend

1. Keep existing Firebase client settings in `client/.env.local`. These web settings are public configuration; **never** put Gemini or Firebase Admin private keys in a `VITE_` variable.
2. Set `VITE_API_URL=https://YOUR-API.onrender.com` for the production build.
3. Run `cd client && npm ci && npm run build`.
4. Create/select an Arckiv Hosting site and apply it to target `arckiv`:
   ```sh
   firebase hosting:sites:create YOUR-ARCKIV-SITE --project whatsapp-8fbf7
   firebase target:apply hosting arckiv YOUR-ARCKIV-SITE --project whatsapp-8fbf7
   firebase deploy --only hosting:arckiv --project whatsapp-8fbf7
   ```
5. Add the resulting site domain to Firebase Authentication → Settings → Authorized domains if absent. Keep existing authorized domains.
6. Sign in on the deployed URL, upload `server/tests/fixtures/invoice.pdf`, open it, search, chat, create/revoke a share, and verify a page refresh on `/my-files` works.

Do not deploy a build with an empty `VITE_API_URL` to Firebase; `/api` would otherwise resolve to the static site.

## Existing local documents

Local development documents are not automatically copied to Atlas. They stay intact on this computer. New cloud uploads use GridFS and survive restarts. Moving existing records also requires copying their originals; do not copy just the database and expect local absolute file paths to work in the cloud.

## Verification commands

```sh
cd server
npm test
RUN_INTEGRATION=true npm test   # creates/removes only arckiv_test_* local databases
node scripts/liveSmoke.js     # real Firebase/Gemini; temporary synthetic account + database
cd ../client
npm run build
npm run lint
cd ../ml
.venv/bin/python -m pytest -q
```

Official limits: [Firebase Cloud Run billing](https://firebase.google.com/docs/hosting/cloud-run), [Render Free](https://render.com/docs/free), [Atlas Free](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).

## Resumed deployment status

See `TEST_REPORT.md` for actual results. No public application release has been verified.
The saved Atlas hostname fails DNS; obtain the current URI from Atlas Connect → Drivers.
Render already has a project named arckiv, with no services at inspection. Reuse it.
The workspace has other services, so its 750 free instance hours are shared.
Do not enable billing or create paid resources. If free hours are exhausted, service availability stops.

## Redeploy from this working directory

```sh
python3 server/scripts/packageDeployment.py
cd deployment-package
git add .
git commit -m "Update Arckiv"
git push origin main
# Render auto-deploys the connected branch; wait for /health to return 200.
cd ..
VITE_API_URL=https://REPLACE_WITH_RENDER_SERVICE.onrender.com firebase deploy --only hosting:arckiv --project whatsapp-8fbf7 --account abishekvh@gmail.com
```

Keep the existing local `.env` files. Use `deploy/.env.example` as the Render checklist.
Never commit secrets. Firebase's existing default Hosting site belongs to another app;
the separate site `arckiv-whatsapp-8fbf7` and target `arckiv` are now created; no app release has been published.
The frontend predeploy script deliberately refuses an absent or unhealthy backend.

## V2 testing without consuming Gemini quota

Start the current ML service, then run from `server`:
```sh
RUN_LIVE_ML=true MOCK_GEMINI=true node --test tests/e2e_ml_upload.test.js
```
This uses real FastAPI, PDF text extraction and MongoDB, with simulated Gemini metadata.
For fully live Gemini integration, omit MOCK_GEMINI only when quota is available.
Stored evaluation reports are not an independent production accuracy guarantee.
The current artifact checksum is recorded in `deploy/model-manifest.json`.

First-time source publication still requires explicit approval; no remote GitHub repository has been created. See `NEXT_STEPS.md`. The deployment package intentionally excludes tests and fixtures; run verification commands from the original working tree.
