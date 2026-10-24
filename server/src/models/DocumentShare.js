const mongoose = require('mongoose');

/**
 * DocumentShare — time-limited cryptographic share links.
 * 
 * Security: Only tokenHash (SHA-256) is stored. The raw token is never persisted.
 * ownerId is a proper ObjectId ref to User.
 */
const documentShareSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Raw token is NEVER stored — only the SHA-256 hash is persisted
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  permission: {
    type: String,
    enum: ['view', 'download'],
    default: 'view',
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  accessCount: {
    type: Number,
    default: 0,
  },
  lastAccessedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index: list active shares for a document owned by a user
documentShareSchema.index({ documentId: 1, ownerId: 1, isActive: 1 });

module.exports = mongoose.model('DocumentShare', documentShareSchema);
