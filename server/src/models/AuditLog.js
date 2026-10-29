const mongoose = require('mongoose');

/**
 * AuditLog — immutable audit trail of administrative operations.
 * Records all privileged actions performed by administrators:
 * - User status toggles (active/disabled)
 * - User profile metadata edits
 * - Classification overrides / reviews
 * - System operational diagnostics
 */
const auditLogSchema = new mongoose.Schema(
  {
    adminEmail: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'USER_STATUS_CHANGE',
        'USER_METADATA_UPDATE',
        'DOCUMENT_CATEGORY_OVERRIDE',
        'DOCUMENT_METADATA_UPDATE',
        'SYSTEM_DIAGNOSTIC_RUN',
        'ADMIN_LOGIN'
      ],
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['User', 'Document', 'System', 'Inference'],
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      index: true,
    },
    targetLabel: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
      index: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'auditLogs',
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
