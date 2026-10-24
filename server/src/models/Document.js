const mongoose = require('mongoose');

/**
 * Document — core document identity and metadata.
 * 
 * Physical file info → DocumentVersion (1:N)
 * AI content + embedding → DocumentContent (1:1)
 * History events → DocumentHistory (1:N)
 * Share links → DocumentShare (1:N)
 * Owner → User (N:1) via proper ObjectId ref
 */
const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Current active version pointer
  currentVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentVersion',
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  // File access fields kept for backward-compatibility during URL-coupling transition.
  // These mirror the current DocumentVersion and allow existing file-serving routes
  // to continue working without joining DocumentVersion on every request.
  url: {
    type: String,
  },
  type: {
    type: String, // MIME type
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    default: 'Uncategorized',
  },
  classification: {
    source: { type: String, enum: ['ml', 'gemini', 'manual', 'default'] },
    status: String,
    category: String,
    confidence: { type: Number, default: null },
    threshold: Number,
    modelId: String,
    demo: Boolean,
  },
  tags: [{
    type: String,
  }],
  expiryDate: {
    type: Date,
    default: null,
  },
  lastViewedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

// Compound index for the primary list query: all docs by user, newest first
documentSchema.index({ userId: 1, createdAt: -1 });

// Wildcard text index for full-text search across name, category, tags
documentSchema.index({ name: 'text', category: 'text', tags: 'text' });

module.exports = mongoose.model('Document', documentSchema);
