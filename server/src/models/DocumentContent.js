const mongoose = require('mongoose');

/**
 * DocumentContent — stores AI-extracted content and vector embeddings.
 * Separated from core Document to avoid bloating list queries with 
 * large fullText strings and 24KB embedding arrays.
 * 
 * Relationship: Document (1) ↔ DocumentContent (1) — strict 1:1
 * Access: JOIN via documentId when content is needed (chat, search, detail view)
 */
const documentContentSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    unique: true,   // enforces 1:1 relationship at DB level
    index: true,
  },
  // AI-extracted text fields
  summary: {
    type: String,
    default: '',
  },
  fullText: {
    type: String, // Raw OCR transcription — can be very large
    default: '',
  },
  keyFields: {
    type: mongoose.Schema.Types.Mixed, // Adaptive key-value pairs by document type
    default: {},
  },
  // Vector embedding for semantic search (Atlas Vector Search)
  embedding: {
    type: [Number], // 3072-dimensional vector from gemini-embedding-2
  },
  // Tracks when embedding was last generated — enables stale detection on edit
  embeddingGeneratedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('DocumentContent', documentContentSchema);
