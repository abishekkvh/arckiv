const express = require('express');
const router = express.Router();
const { requireAuth, resolveDbUser } = require('../middleware/auth');
const User = require('../models/User');

// POST /api/auth/sync
// Verifies Firebase token and creates/gets MongoDB User
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;

    if (!email) return res.status(400).json({ error: 'Sign in with an account that has an email address.' });
    const actualLoginTime = req.user.auth_time ? new Date(req.user.auth_time * 1000) : new Date();
    const user = await User.findOneAndUpdate(
      { firebaseUid: uid },
      { 
        $setOnInsert: { firebaseUid: uid, email, name: name || email.split('@')[0], profilePicture: picture || '' },
        $set: { lastLoginAt: actualLoginTime }
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    if (user.status === 'disabled') {
      return res.status(403).json({
        error: 'Your account has been disabled by an administrator. Please contact support.',
        accountDisabled: true
      });
    }

    res.status(200).json({
      message: 'User synced successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        storageUsed: user.storageUsed,
        status: user.status || 'active',
        role: user.role || 'user',
        isAdmin: require('../middleware/admin').isAdmin(req.user)
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
