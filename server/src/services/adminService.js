const mongoose = require('mongoose');
const User = require('../models/User');
const Document = require('../models/Document');
const DocumentHistory = require('../models/DocumentHistory');
const DocumentVersion = require('../models/DocumentVersion');
const Log = require('../models/MlInferenceLog');
const AuditLog = require('../models/AuditLog');
const { recordAuditLog } = require('./auditService');
const app = require('../config/firebase');
const { getAuth } = require('firebase-admin/auth');

const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};

function parsePagination(query) {
  const page = Math.max(1, Math.min(10000, parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  return { page, limit };
}

/**
 * List users with backend pagination, search, status/role filtering,
 * and aggregate storage/document counts.
 */
async function listUsers(query) {
  const { page, limit } = parsePagination(query);
  const match = {};

  if (query.q && typeof query.q === 'string') {
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (query.status && ['active', 'disabled'].includes(query.status)) {
    match.status = query.status;
  }

  if (query.role && ['admin', 'user'].includes(query.role)) {
    match.role = query.role;
  }

  // Sort options
  let sortField = 'createdAt';
  let sortDirection = -1;
  if (query.sortBy === 'name') sortField = 'name';
  else if (query.sortBy === 'storageUsed') sortField = 'storageUsed';
  else if (query.sortBy === 'lastLoginAt') sortField = 'lastLoginAt';

  if (query.sortOrder === 'asc') sortDirection = 1;

  const [usersAggregation, totalUsers, activeCount, disabledCount] = await Promise.all([
    User.aggregate([
      { $match: match },
      { $sort: { [sortField]: sortDirection, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'documents',
          let: { ownerId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$ownerId'] } } },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                bytes: { $sum: '$size' },
                lastUpload: { $max: '$createdAt' },
              },
            },
          ],
          as: 'docStats',
        },
      },
      {
        $project: {
          name: 1,
          email: 1,
          firebaseUid: 1,
          profilePicture: 1,
          status: { $ifNull: ['$status', 'active'] },
          role: { $ifNull: ['$role', 'user'] },
          storageUsed: { $ifNull: ['$storageUsed', 0] },
          disabledReason: 1,
          disabledAt: 1,
          lastLoginAt: 1,
          createdAt: 1,
          updatedAt: 1,
          documentCount: { $ifNull: [{ $arrayElemAt: ['$docStats.count', 0] }, 0] },
          actualStorageBytes: { $ifNull: [{ $arrayElemAt: ['$docStats.bytes', 0] }, 0] },
          lastUploadDate: { $ifNull: [{ $arrayElemAt: ['$docStats.lastUpload', 0] }, null] },
        },
      },
    ]).option({ maxTimeMS: 5000 }),
    User.countDocuments(match).maxTimeMS(5000),
    User.countDocuments({ status: { $ne: 'disabled' } }).maxTimeMS(5000),
    User.countDocuments({ status: 'disabled' }).maxTimeMS(5000),
  ]);

  return {
    users: usersAggregation,
    total: totalUsers,
    page,
    pages: Math.max(1, Math.ceil(totalUsers / limit)),
    limit,
    stats: {
      totalUsers,
      activeUsers: activeCount,
      disabledUsers: disabledCount,
    },
  };
}

/**
 * Get detailed profile, storage breakdown, documents, and activity for a user.
 */
async function getUserDetails(userId) {
  if (!mongoose.isValidObjectId(userId)) fail('Invalid user ID');
  const user = await User.findById(userId).lean();
  if (!user) fail('User not found', 404);

  const [docSummary, typeBreakdown, categoryBreakdown, recentDocuments, recentActivity, inferenceSummary] = await Promise.all([
    // Total documents and bytes
    Document.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalDocs: { $sum: 1 },
          totalBytes: { $sum: '$size' },
          lastUpload: { $max: '$createdAt' },
        },
      },
    ]).option({ maxTimeMS: 5000 }),

    // MIME type distribution
    Document.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $eq: ['$type', 'application/pdf'] }, then: 'PDF' },
                { case: { $regexMatch: { input: '$type', regex: '^image/' } }, then: 'Image' },
                {
                  case: {
                    $eq: [
                      '$type',
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    ],
                  },
                  then: 'DOCX',
                },
              ],
              default: 'Other',
            },
          },
          count: { $sum: 1 },
          bytes: { $sum: '$size' },
        },
      },
    ]).option({ maxTimeMS: 5000 }),

    // Category distribution
    Document.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: { $ifNull: ['$category', 'Uncategorized'] },
          count: { $sum: 1 },
          bytes: { $sum: '$size' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]).option({ maxTimeMS: 5000 }),

    // First page of documents (top 15)
    Document.find({ userId: new mongoose.Types.ObjectId(userId) })
      .select('name type size category classification createdAt')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean()
      .maxTimeMS(5000),

    // Activity timeline from DocumentHistory
    DocumentHistory.find({ userId: new mongoose.Types.ObjectId(userId) })
      .populate('documentId', 'name category type')
      .sort({ createdAt: -1 })
      .limit(25)
      .lean()
      .maxTimeMS(5000),

    // ML inference logs for this user
    Log.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          accepted: { $sum: { $cond: ['$accepted', 1, 0] } },
          fallbacks: { $sum: { $cond: ['$geminiFallback', 1, 0] } },
          averageConfidence: { $avg: '$confidence' },
        },
      },
    ]).option({ maxTimeMS: 5000 }),
  ]);

  const summary = docSummary[0] || { totalDocs: 0, totalBytes: 0, lastUpload: null };
  const mlStats = inferenceSummary[0] || { total: 0, accepted: 0, fallbacks: 0, averageConfidence: null };

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      firebaseUid: user.firebaseUid,
      profilePicture: user.profilePicture,
      status: user.status || 'active',
      role: user.role || 'user',
      storageUsed: user.storageUsed,
      disabledReason: user.disabledReason,
      disabledAt: user.disabledAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    storage: {
      totalDocs: summary.totalDocs,
      totalBytes: summary.totalBytes,
      lastUpload: summary.lastUpload,
      types: typeBreakdown.map((t) => ({ label: t._id, count: t.count, bytes: t.bytes })),
      categories: categoryBreakdown.map((c) => ({ label: c._id, count: c.count, bytes: c.bytes })),
    },
    recentDocuments,
    recentActivity: recentActivity.map((evt) => ({
      _id: evt._id,
      action: evt.action,
      createdAt: evt.createdAt,
      documentName: evt.documentId?.name || evt.metadata?.filename || 'Document',
      documentId: evt.documentId?._id || evt.documentId,
      metadata: evt.metadata,
    })),
    mlSummary: {
      total: mlStats.total,
      accepted: mlStats.accepted,
      fallbacks: mlStats.fallbacks,
      acceptanceRate: mlStats.total ? mlStats.accepted / mlStats.total : null,
      averageConfidence: mlStats.averageConfidence,
    },
  };
}

/**
 * Get paginated documents for a specific user with filtering.
 */
async function getUserDocuments(userId, query) {
  if (!mongoose.isValidObjectId(userId)) fail('Invalid user ID');
  const { page, limit } = parsePagination(query);

  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  if (query.q && typeof query.q === 'string') {
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: escaped, $options: 'i' };
  }
  if (query.category) {
    filter.category = query.category;
  }

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .select('name type size category classification createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .maxTimeMS(5000),
    Document.countDocuments(filter).maxTimeMS(5000),
  ]);

  return {
    documents,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}

/**
 * Update permitted user metadata (e.g. display name).
 */
async function updateUserMetadata(userId, updates, adminEmail, ipAddress) {
  if (!mongoose.isValidObjectId(userId)) fail('Invalid user ID');
  const user = await User.findById(userId);
  if (!user) fail('User not found', 404);

  const allowedFields = ['name'];
  const changes = {};

  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || !updates.name.trim() || updates.name.length > 100) {
      fail('Invalid display name (must be between 1 and 100 characters)');
    }
    const trimmed = updates.name.trim();
    if (trimmed !== user.name) {
      changes.name = { from: user.name, to: trimmed };
      user.name = trimmed;
    }
  }

  if (Object.keys(changes).length === 0) {
    return { message: 'No changes detected', user };
  }

  await user.save();

  await recordAuditLog({
    adminEmail,
    action: 'USER_METADATA_UPDATE',
    targetType: 'User',
    targetId: user._id,
    targetLabel: `${user.name} (${user.email})`,
    details: { changes },
    status: 'success',
    ipAddress,
  });

  return { message: 'User updated successfully', user };
}

/**
 * Update user status (active/disabled).
 * Strictly guards owner admin 'abishekvh@gmail.com' from lockout/demotion!
 */
async function updateUserStatus(userId, { status, reason = '' }, adminEmail, ipAddress) {
  if (!mongoose.isValidObjectId(userId)) fail('Invalid user ID');
  if (!['active', 'disabled'].includes(status)) fail("Status must be 'active' or 'disabled'");

  const user = await User.findById(userId);
  if (!user) fail('User not found', 404);

  // OWNER ACCOUNT PROTECTION:
  if (user.email.toLowerCase() === 'abishekvh@gmail.com') {
    fail('The primary owner administrator account cannot be disabled or modified.', 403);
  }

  const previousStatus = user.status || 'active';
  if (previousStatus === status) {
    return { message: `User is already ${status}`, user };
  }

  user.status = status;
  user.disabledReason = status === 'disabled' ? (reason ? String(reason).slice(0, 300) : 'Administrative action') : null;
  user.disabledAt = status === 'disabled' ? new Date() : null;

  await user.save();

  // Best-effort Firebase Admin synchronization if available
  try {
    if (user.firebaseUid) {
      await getAuth(app).updateUser(user.firebaseUid, {
        disabled: status === 'disabled',
      });
    }
  } catch (firebaseErr) {
    console.warn('[FIREBASE_UPDATE_USER_STATUS_SKIPPED]', firebaseErr.message);
  }

  await recordAuditLog({
    adminEmail,
    action: 'USER_STATUS_CHANGE',
    targetType: 'User',
    targetId: user._id,
    targetLabel: `${user.name} (${user.email})`,
    details: {
      previousStatus,
      newStatus: status,
      reason: user.disabledReason,
    },
    status: 'success',
    ipAddress,
  });

  return {
    message: `User account successfully ${status === 'disabled' ? 'disabled' : 'reactivated'}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      status: user.status,
      disabledReason: user.disabledReason,
      disabledAt: user.disabledAt,
    },
  };
}

/**
 * Global document inventory across all users.
 */
async function listGlobalDocuments(query) {
  const { page, limit } = parsePagination(query);
  const match = {};

  if (query.q && typeof query.q === 'string') {
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    match.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { category: { $regex: escaped, $options: 'i' } },
      { tags: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (query.category) {
    match.category = query.category;
  }

  if (query.type) {
    if (query.type === 'pdf') match.type = 'application/pdf';
    else if (query.type === 'image') match.type = { $regex: '^image/' };
    else if (query.type === 'docx') {
      match.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
  }

  if (query.source && ['ml', 'gemini', 'default', 'manual'].includes(query.source)) {
    match['classification.source'] = query.source;
  }

  if (query.userId && mongoose.isValidObjectId(query.userId)) {
    match.userId = new mongoose.Types.ObjectId(query.userId);
  }

  if (query.from || query.to) {
    match.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from + 'T00:00:00Z');
      if (Number.isFinite(+fromDate)) match.createdAt.$gte = fromDate;
    }
    if (query.to) {
      const toDate = new Date(query.to + 'T23:59:59.999Z');
      if (Number.isFinite(+toDate)) match.createdAt.$lte = toDate;
    }
  }

  let sortField = 'createdAt';
  let sortDirection = -1;
  if (query.sortBy === 'name') sortField = 'name';
  else if (query.sortBy === 'size') sortField = 'size';
  else if (query.sortBy === 'category') sortField = 'category';
  if (query.sortOrder === 'asc') sortDirection = 1;

  const [docsAggregation, totalDocs, globalStats] = await Promise.all([
    Document.aggregate([
      { $match: match },
      { $sort: { [sortField]: sortDirection, _id: 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          pipeline: [{ $project: { _id: 1, name: 1, email: 1, profilePicture: 1 } }],
          as: 'owner',
        },
      },
      {
        $set: {
          owner: { $arrayElemAt: ['$owner', 0] },
        },
      },
      {
        $project: {
          name: 1,
          type: 1,
          size: 1,
          category: 1,
          classification: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1,
          owner: 1,
        },
      },
    ]).option({ maxTimeMS: 5000 }),
    Document.countDocuments(match).maxTimeMS(5000),
    Document.aggregate([
      {
        $group: {
          _id: null,
          totalCount: { $sum: 1 },
          totalBytes: { $sum: '$size' },
        },
      },
    ]).option({ maxTimeMS: 5000 }),
  ]);

  const stats = globalStats[0] || { totalCount: 0, totalBytes: 0 };

  return {
    documents: docsAggregation,
    total: totalDocs,
    page,
    pages: Math.max(1, Math.ceil(totalDocs / limit)),
    limit,
    globalStats: stats,
  };
}

/**
 * Deep inspection of a single document.
 * SECURITY: Admin preview is strictly restricted to metadata.
 * Does not bypass encryption or expose raw user file contents.
 */
async function getDocumentDetails(documentId) {
  if (!mongoose.isValidObjectId(documentId)) fail('Invalid document ID');
  const doc = await Document.findById(documentId).populate('userId', 'name email profilePicture firebaseUid').lean();
  if (!doc) fail('Document not found', 404);

  const [versions, history, linkedInference] = await Promise.all([
    DocumentVersion.find({ documentId: new mongoose.Types.ObjectId(documentId) })
      .select('versionNumber size type createdAt uploadedBy')
      .sort({ versionNumber: -1 })
      .lean()
      .maxTimeMS(5000),
    DocumentHistory.find({ documentId: new mongoose.Types.ObjectId(documentId) })
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(5000),
    Log.findOne({ documentId: new mongoose.Types.ObjectId(documentId) })
      .lean()
      .maxTimeMS(5000),
  ]);

  return {
    document: {
      _id: doc._id,
      name: doc.name,
      type: doc.type,
      size: doc.size,
      category: doc.category,
      classification: doc.classification || {},
      tags: doc.tags || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      expiryDate: doc.expiryDate,
      owner: doc.userId,
    },
    versions,
    history,
    inference: linkedInference || null,
    securityNotice:
      'Preview restricted by encryption and user access control policy. Raw document contents are encrypted or end-user protected; administrators can view system metadata, classifications, and lifecycle audit logs.',
  };
}

/**
 * Deep system health diagnostics.
 */
async function getSystemHealth() {
  const mem = process.memoryUsage();
  const uptimeSeconds = process.uptime();

  // Classifier service health probe
  let classifierStatus = { ready: false, status: 'unavailable', latencyMs: null };
  if (process.env.CLASSIFIER_URL) {
    const start = performance.now();
    try {
      const res = await fetch(`${process.env.CLASSIFIER_URL.replace(/\/$/, '')}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        classifierStatus = {
          ready: data.ready === true,
          status: data.ready ? 'operational' : 'degraded',
          model: data.model || null,
          latencyMs,
        };
      }
    } catch {
      classifierStatus = { ready: false, status: 'unavailable', latencyMs: null };
    }
  }

  // MongoDB connection status & telemetry
  let mongoStatus = { connected: false, readyState: mongoose.connection.readyState };
  try {
    const mongoStart = performance.now();
    await mongoose.connection.db.admin().ping();
    const pingMs = Math.round(performance.now() - mongoStart);
    mongoStatus = {
      connected: true,
      readyState: mongoose.connection.readyState,
      pingMs,
      databaseName: mongoose.connection.name,
    };
  } catch (err) {
    mongoStatus.error = err.message;
  }

  // Recent error metrics from ML logs
  const [errorStats, counts] = await Promise.all([
    Log.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          extractionFailures: {
            $sum: { $cond: [{ $eq: ['$extractionStatus', 'unavailable'] }, 1, 0] },
          },
          mlFailures: {
            $sum: {
              $cond: [
                {
                  $in: [
                    '$decisionStatus',
                    [
                      'unavailable',
                      'invalid_confidence',
                      'model_mismatch',
                      'experimental_model_rejected',
                      'demo_model_rejected',
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          failedUploads: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
    ]).option({ maxTimeMS: 5000 }),
    Promise.all([User.countDocuments(), Document.countDocuments(), Log.countDocuments(), AuditLog.countDocuments()]),
  ]);

  const errors = errorStats[0] || { extractionFailures: 0, mlFailures: 0, failedUploads: 0, total: 0 };

  return {
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSeconds: Math.floor(uptimeSeconds),
      memory: {
        rssMB: Math.round(mem.rss / 1048576),
        heapUsedMB: Math.round(mem.heapUsed / 1048576),
        heapTotalMB: Math.round(mem.heapTotal / 1048576),
      },
    },
    database: mongoStatus,
    classifier: classifierStatus,
    counts: {
      users: counts[0],
      documents: counts[1],
      inferences: counts[2],
      auditLogs: counts[3],
    },
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * List audit logs with pagination and filters.
 */
async function listAuditLogs(query) {
  const { page, limit } = parsePagination(query);
  const filter = {};

  if (query.action) filter.action = query.action;
  if (query.targetType) filter.targetType = query.targetType;
  if (query.status) filter.status = query.status;

  if (query.q && typeof query.q === 'string') {
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { adminEmail: { $regex: escaped, $options: 'i' } },
      { targetLabel: { $regex: escaped, $options: 'i' } },
      { targetId: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .maxTimeMS(5000),
    AuditLog.countDocuments(filter).maxTimeMS(5000),
  ]);

  return {
    logs,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    limit,
  };
}

module.exports = {
  listUsers,
  getUserDetails,
  getUserDocuments,
  updateUserMetadata,
  updateUserStatus,
  listGlobalDocuments,
  getDocumentDetails,
  getSystemHealth,
  listAuditLogs,
};
