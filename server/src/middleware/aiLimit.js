// Per-account cost guard for the single-instance free deployment.
const windows = new Map();
let active = 0;
const WINDOW_MS = 10 * 60 * 1000;
const cleanup = setInterval(() => { for (const [key, item] of windows) if (item.until <= Date.now()) windows.delete(key); }, WINDOW_MS);
cleanup.unref();
module.exports = function aiLimit(req, res, next) {
  const key = req.user.uid;
  let item = windows.get(key);
  if (!item || item.until <= Date.now()) { item = { count: 0, until: Date.now() + WINDOW_MS }; windows.set(key, item); }
  if (item.count >= 20) {
    res.set('Retry-After', String(Math.ceil((item.until - Date.now()) / 1000)));
    return res.status(429).json({ error: 'AI request limit reached. Please try again in a few minutes.' });
  }
  const maxActive = Number(process.env.MAX_AI_CONCURRENCY || 4);
  if (active >= maxActive) return res.status(429).json({ error: 'Another document is being processed. Please retry in a moment.' });
  item.count++;
  active++;
  let released = false;
  const release = () => { if (!released) { active--; released = true; } };
  res.once('finish', release);
  res.once('close', release);
  next();
};
