const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.disable('x-powered-by');
const origins = new Set((process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(s => s.trim().replace(/\/$/, '')));
// Canonical Firebase site; retain configured origins during the domain migration.
if (process.env.NODE_ENV === 'production') origins.add('https://arckiv.web.app');
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.has(origin) || (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) return callback(null, true);
    callback(Object.assign(new Error('Origin not allowed'), { status: 403 }));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});
// Original files are served only through authenticated or token-validated routes.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/shared', require('./routes/shared'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.get('/health', async (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  let classifier = { required: process.env.CLASSIFIER_REQUIRED === 'true', ready: false };
  if (classifier.required) {
    try {
      const response = await fetch(`${process.env.CLASSIFIER_URL}/health`, { signal: AbortSignal.timeout(2000) });
      const health = await response.json();
      classifier.ready = response.ok && health.ready === true && health.model?.model_id === process.env.CLASSIFIER_EXPECTED_MODEL_ID;
      classifier.modelId = health.model?.model_id;
      classifier.threshold = health.model?.confidence_threshold;
    } catch { classifier.ready = false; }
  }
  const ready = databaseReady && (!classifier.required || classifier.ready);
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable', database: databaseReady ? 'connected' : 'unavailable', classifier, revision: process.env.RENDER_GIT_COMMIT || 'local' });
});
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : (error.status || (error.name === 'MulterError' ? 400 : 500));
  res.status(status).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 10 MB limit.' : status < 500 ? error.message : 'Server error. Please try again.' });
});
module.exports = app;
