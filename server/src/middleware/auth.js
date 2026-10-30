const app = require('../config/firebase');
const { getAuth } = require('firebase-admin/auth');
const User = require('../models/User');

// ── Lightweight in-process user cache ────────────────────────────────────────
// Avoids a MongoDB round-trip on every authenticated request.
// TTL: 60 s — short enough to propagate account status changes promptly.
const USER_CACHE_TTL_MS = 60_000;
const userCache = new Map(); // uid → { user, expiresAt }

function cacheGet(uid) {
  const entry = userCache.get(uid);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { userCache.delete(uid); return null; }
  return entry.user;
}
function cacheSet(uid, user) {
  userCache.set(uid, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}
/** Call this when a user's status/role may have changed (admin actions, etc.) */
function cacheInvalidate(uid) { userCache.delete(uid); }
// Periodically evict expired entries to avoid unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of userCache) { if (now > v.expiresAt) userCache.delete(k); }
}, 5 * 60_000).unref();

/**
 * requireAuth — verifies Firebase JWT bearer token.
 * Attaches req.user (decoded Firebase token) for uid access.
 */
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth(app).verifyIdToken(idToken);
    req.user = decodedToken; // contains .uid (Firebase UID string)
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * resolveDbUser — resolves Firebase UID to a MongoDB User document.
 * Must be called after requireAuth (depends on req.user.uid).
 * Attaches req.dbUser (full Mongoose User document with ._id).
 *
 * Usage: router.get('/route', requireAuth, resolveDbUser, handler)
 */
const resolveDbUser = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    // Serve from cache when available — avoids a DB round-trip on every request
    let user = cacheGet(uid);
    if (!user) {
      user = await User.findOne({ firebaseUid: uid }).lean();
      if (user) cacheSet(uid, user);
    }
    if (!user) {
      // User exists in Firebase but not synced to MongoDB yet — trigger sync hint
      return res.status(401).json({
        error: 'User not found in database. Please log out and log in again to sync your account.'
      });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Your account has been disabled by an administrator. Please contact support.',
        accountDisabled: true,
      });
    }
    req.dbUser = user; // { _id, firebaseUid, email, name, ... }
    next();
  } catch (error) {
    console.error('Error resolving DB user:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { requireAuth, resolveDbUser, cacheInvalidate };
