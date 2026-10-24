import { build, loadEnv } from 'vite';
const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
if (!env.VITE_API_URL?.startsWith('https://') || /localhost|127\.0\.0\.1/.test(env.VITE_API_URL)) {
  throw new Error('Set VITE_API_URL to the deployed HTTPS API origin before building for Firebase Hosting.');
}
for (const key of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']) {
  if (!env[key]) throw new Error(`Missing ${key}`);
}
const health = await fetch(`${env.VITE_API_URL.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(120000) });
if (!health.ok || (await health.json()).status !== 'ok') throw new Error('Backend health check failed; deployment build stopped.');
await build();
