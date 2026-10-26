// Firebase custom claims are assigned only by the Admin SDK, never by registration.
function isAdmin(user) { return user?.arckivAdmin === true && user.email_verified === true && user.email?.toLowerCase() === 'abishekvh@gmail.com'; }
function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Administrator access required.' });
  next();
}
module.exports = { isAdmin, requireAdmin };
