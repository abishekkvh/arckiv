const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const User = require('../models/User');
const Document = require('../models/Document');
const evaluation = require('../data/modelEvaluation.json');
const monitoring = require('../services/adminMonitoring');
const adminService = require('../services/adminService');

// All admin routes strictly require verified Firebase token and owner-admin custom claim
router.use(requireAuth, requireAdmin);

// Legacy overview endpoint (preserved)
router.get('/overview', async (req, res, next) => {
  try {
    const page = Math.max(1, Math.min(100000, parseInt(req.query.page, 10) || 1));
    const [totalUsers, totalDocuments, users, classifications] = await Promise.all([
      User.countDocuments(),
      Document.countDocuments(),
      User.aggregate([
        { $sort: { createdAt: -1, _id: 1 } },
        { $skip: (page - 1) * 20 },
        { $limit: 20 },
        {
          $lookup: {
            from: 'documents',
            let: { owner: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$userId', '$$owner'] } } },
              { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: '$size' } } },
            ],
            as: 'usage',
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            status: { $ifNull: ['$status', 'active'] },
            role: { $ifNull: ['$role', 'user'] },
            createdAt: 1,
            lastLoginAt: 1,
            documentCount: { $ifNull: [{ $arrayElemAt: ['$usage.count', 0] }, 0] },
            storageBytes: { $ifNull: [{ $arrayElemAt: ['$usage.bytes', 0] }, 0] },
          },
        },
      ]),
      Document.aggregate([{ $group: { _id: { $ifNull: ['$classification.source', 'unclassified'] }, count: { $sum: 1 } } }]),
    ]);
    let model = { ready: false };
    try {
      const r = await fetch(`${process.env.CLASSIFIER_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) model = await r.json();
    } catch {}
    res.json({
      totalUsers,
      totalDocuments,
      users,
      page,
      pages: Math.max(1, Math.ceil(totalUsers / 20)),
      classifications,
      model,
      evaluation,
    });
  } catch (e) {
    next(e);
  }
});

// Real User Management Center routes
router.get('/users', async (req, res, next) => {
  try {
    res.json(await adminService.listUsers(req.query));
  } catch (e) {
    next(e);
  }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    res.json(await adminService.getUserDetails(req.params.id));
  } catch (e) {
    next(e);
  }
});

router.get('/users/:id/documents', async (req, res, next) => {
  try {
    res.json(await adminService.getUserDocuments(req.params.id, req.query));
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    res.json(await adminService.updateUserMetadata(req.params.id, req.body, req.user.email, req.ip));
  } catch (e) {
    next(e);
  }
});

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    res.json(await adminService.updateUserStatus(req.params.id, req.body, req.user.email, req.ip));
  } catch (e) {
    next(e);
  }
});

// Global Document Management routes
router.get('/documents', async (req, res, next) => {
  try {
    res.json(await adminService.listGlobalDocuments(req.query));
  } catch (e) {
    next(e);
  }
});

router.get('/documents/:id', async (req, res, next) => {
  try {
    res.json(await adminService.getDocumentDetails(req.params.id));
  } catch (e) {
    next(e);
  }
});

// System Health & Audit routes
router.get('/system/health', async (req, res, next) => {
  try {
    res.json(await adminService.getSystemHealth());
  } catch (e) {
    next(e);
  }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    res.json(await adminService.listAuditLogs(req.query));
  } catch (e) {
    next(e);
  }
});

// ML Monitoring & Decision routes
router.get('/inferences', async (req, res, next) => {
  try {
    res.json(await monitoring.decisions(req.query));
  } catch (e) {
    next(e);
  }
});

router.get('/inferences/:id', async (req, res, next) => {
  try {
    res.json(await monitoring.decision(req.params.id));
  } catch (e) {
    next(e);
  }
});

router.get('/analytics', async (req, res, next) => {
  try {
    res.json(await monitoring.analytics());
  } catch (e) {
    next(e);
  }
});

router.get('/quality', async (req, res, next) => {
  try {
    res.json(await monitoring.quality(req.query));
  } catch (e) {
    next(e);
  }
});

router.get('/registry', async (req, res, next) => {
  try {
    res.json({ ...monitoring.registry, health: await monitoring.modelHealth() });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
