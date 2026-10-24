const { streamDocument } = require('../services/storageService');
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const DocumentShare = require('../models/DocumentShare');
const Document = require('../models/Document');
const DocumentContent = require('../models/DocumentContent');

// Helper to hash token
const hashToken = (token) => {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
};

// GET /api/shared/:token
// Public endpoint: Validates token and returns document metadata and allowed capabilities
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(404).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    const tokenHash = hashToken(token);
    const share = await DocumentShare.findOne({ tokenHash, isActive: true });

    if (!share) {
      return res.status(404).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    // Server-side expiration check
    if (new Date() > new Date(share.expiresAt)) {
      return res.status(410).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    const document = await Document.findById(share.documentId);
    if (!document) {
      return res.status(404).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    // Record access metrics asynchronously
    share.accessCount = (share.accessCount || 0) + 1;
    share.lastAccessedAt = new Date();
    await share.save();

    // Fetch summary & keyFields from DocumentContent (no longer inline on Document)
    let summary = '';
    let keyFields = {};
    try {
      const content = await DocumentContent.findOne(
        { documentId: document._id },
        { summary: 1, keyFields: 1 }
      ).lean();
      if (content) {
        summary = content.summary || '';
        keyFields = content.keyFields || {};
      }
    } catch (contentErr) {
      console.error('[SHARED] Failed to fetch DocumentContent:', contentErr.message);
    }

    // Build safe public document payload (no internal user IDs or backend file paths)
    res.status(200).json({
      document: {
        id: document._id,
        name: document.name,
        type: document.type,
        size: document.size,
        category: document.category,
        tags: document.tags || [],
        summary: summary || '',
        keyFields: keyFields || {},
        createdAt: document.createdAt
      },
      share: {
        permission: share.permission,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt
      },
      fileUrl: `/api/shared/${token}/file`
    });

  } catch (error) {
    console.error('Public Share Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/shared/:token/file
// Public endpoint: Safely streams the file for view or download based on permissions
router.get('/:token/file', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      return res.status(404).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    const tokenHash = hashToken(token);
    const share = await DocumentShare.findOne({ tokenHash, isActive: true });

    if (!share) {
      return res.status(404).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    // Check expiration
    if (new Date() > new Date(share.expiresAt)) {
      return res.status(410).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    const document = await Document.findById(share.documentId);
    if (!document) {
      return res.status(404).json({ error: 'This shared document link has expired or has been revoked.' });
    }

    // Determine disposition
    const isDownloadRequested = req.query.download === '1' || req.query.download === 'true';
    if (isDownloadRequested && share.permission !== 'download') {
      return res.status(403).json({ error: 'Download permission is not granted for this share link.' });
    }

    await streamDocument(document, res, isDownloadRequested);

  } catch (error) {
    console.error('Public Share File Stream Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
