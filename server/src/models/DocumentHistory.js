const mongoose = require('mongoose');

/**
 * DocumentHistory — immutable audit trail of document lifecycle events.
 * 
 * userId is a proper ObjectId ref to User (resolved from Firebase UID at auth time).
 * documentId is a proper ObjectId ref to Document.
 */
const documentHistorySchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    // REUPLOAD and RESTORE removed — confirmed 0 records used these values
    enum: ['UPLOAD', 'EDIT', 'SHARE', 'UNSHARE', 'DELETE'],
    required: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Compound index: history for a document ordered by time (primary query pattern)
documentHistorySchema.index({ documentId: 1, createdAt: -1 });
// Index for dashboard recent activity: all events by user ordered by time
documentHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('DocumentHistory', documentHistorySchema);
