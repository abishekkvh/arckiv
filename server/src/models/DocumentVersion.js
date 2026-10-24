const mongoose = require('mongoose');

/**
 * DocumentVersion — stores physical file information for each version of a document.
 * Decouples file storage details from document identity and metadata.
 * 
 * Relationship: Document (1) → DocumentVersion (N)
 * documents.currentVersionId → documentversions._id (latest)
 */
const documentVersionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  versionNumber: {
    type: Number,
    required: true,
    default: 1,
  },
  // Storage details — decoupled from environment
  storagePath: {
    type: String, // Absolute server-side path (local) or object key (cloud)
    required: true,
  },
  storageProvider: {
    type: String,
    enum: ['local', 's3', 'gcs', 'gridfs'],
    default: 'local',
    required: true,
  },
  storageKey: {
    type: String, // filename for local, S3/GCS key for cloud
    required: true,
  },
  url: {
    type: String, // Public-accessible URL (environment-dependent)
    required: true,
  },
  type: {
    type: String, // MIME type
    required: true,
  },
  size: {
    type: Number, // bytes
    required: true,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Compound index: find all versions for a document, ordered
documentVersionSchema.index({ documentId: 1, versionNumber: 1 });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);
