const aiLimit = require('../middleware/aiLimit');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const mongoose = require('mongoose');
const { requireAuth, resolveDbUser } = require('../middleware/auth');
const Document = require('../models/Document');
const DocumentHistory = require('../models/DocumentHistory');
const DocumentShare = require('../models/DocumentShare');
const DocumentContent = require('../models/DocumentContent');
const DocumentVersion = require('../models/DocumentVersion');
const { analyzeDocument, buildSearchableText, generateEmbedding } = require('../services/aiService');
const { classifyDocument } = require('../services/classifierService');
const { extractPdfText } = require('../services/pdfService');
const { uploadDir, persistFile, streamDocument, withLocalFile, deleteStoredFile } = require('../services/storageService');
const { withTransaction } = require('../utils/transaction');

// Set up Multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage, limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(Object.assign(new Error('Upload a PDF, JPEG, or PNG file (maximum 10 MB).'), { status: 400 }));
    }
    cb(null, true);
  },
});
router.param('id', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid document ID' });
  next();
});
router.param('shareId', (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid share ID' });
  next();
});
router.get('/:id/file', requireAuth, resolveDbUser, async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.dbUser._id });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    await streamDocument(document, res, req.query.download === '1');
  } catch (error) { next(error); }
});

// ─── Helper: safe serialize a document for API response ─────────────────────
// Joins extractedData from DocumentContent so the API shape is unchanged for
// the frontend. Does NOT return embedding or fullText on list responses.
function serializeDoc(doc, content = null) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  if (content) {
    obj.extractedData = {
      summary: content.summary || '',
      keyFields: content.keyFields || {},
    };
  }
  // Never send embedding or fullText in list/detail responses
  delete obj.embedding;
  if (obj.extractedData) delete obj.extractedData.fullText;
  return obj;
}

// ─── POST /api/documents/upload ────────────────────────────────────────────
router.post('/upload', requireAuth, resolveDbUser, aiLimit, upload.single('document'), async (req, res) => {
  let storedFile;
  let saved = false;
  let documentId;
  try {
    const file = req.file;
    const dbUserId = req.dbUser._id; // MongoDB ObjectId

    console.log('[UPLOAD START]', {
      originalName: file?.originalname,
      mimeType: file?.mimetype,
      size: file?.size,
      userId: String(dbUserId)
    });

    if (!file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const handle = await fs.promises.open(file.path, 'r');
    const magic = Buffer.alloc(8);
    try { await handle.read(magic, 0, 8, 0); } finally { await handle.close(); }
    const valid = file.mimetype === 'application/pdf' ? magic.subarray(0, 5).toString() === '%PDF-' :
      file.mimetype === 'image/png' ? magic.equals(Buffer.from([137,80,78,71,13,10,26,10])) : magic[0] === 255 && magic[1] === 216 && magic[2] === 255;
    if (!valid) return res.status(400).json({ error: 'File contents do not match a supported PDF or image.' });
    const absoluteFilePath = file.path;
    documentId = new mongoose.Types.ObjectId();
    const publicUrl = `/api/documents/${documentId}/file`;
    storedFile = await persistFile(file);

    // 1. AI Analysis (optional — failure must NOT break upload)
    let aiResult = { summary: '', tags: [], category: 'Uncategorized', fullText: '', keyFields: {} };
    let aiSuccess = false;
    try {
      aiResult = await analyzeDocument(absoluteFilePath, file.mimetype);
      aiSuccess = true;
      console.log('[AI ANALYSIS SUCCESS]', { category: aiResult.category, tagsCount: aiResult.tags?.length });
    } catch (aiError) {
      console.log('[AI ANALYSIS FAILED]', aiError.message?.substring(0, 200));
    }

    let extractedText = aiResult.fullText;
    if (!extractedText && file.mimetype === 'application/pdf') {
      try {
        const localExtracted = await extractPdfText(absoluteFilePath);
        if (localExtracted?.text) {
          extractedText = localExtracted.text;
          if (!aiResult.fullText) aiResult.fullText = localExtracted.text;
        }
      } catch (err) {
        console.warn('[LOCAL PDF EXTRACTION FAILED]', err.message);
      }
    }

    const classification = await classifyDocument(extractedText);
    if (classification.source === 'ml') aiResult.category = classification.category;
    if (classification.source !== 'ml' && !aiSuccess) classification.source = 'default';

    // 2. Save Document + DocumentVersion + DocumentContent + History in one transaction (or safe sequence if standalone)
    let document, content, version;
    await withTransaction(async (session) => {
      const opts = session ? { session } : {};

      // 2a. Create Document (lean — no extractedData, no embedding)
      [document] = await Document.create([{
        _id: documentId,
        userId: dbUserId,
        name: file.originalname,
        url: publicUrl,
        type: file.mimetype,
        size: file.size,
        category: aiResult.category || 'Uncategorized',
        classification,
        tags: aiResult.tags || [],
      }], opts);

      // 2b. Create DocumentVersion
      [version] = await DocumentVersion.create([{
        documentId: document._id,
        versionNumber: 1,
        ...storedFile,
        url: publicUrl,
        type: file.mimetype,
        size: file.size,
        uploadedBy: dbUserId,
      }], opts);

      // 2c. Create DocumentContent
      [content] = await DocumentContent.create([{
        documentId: document._id,
        summary: aiResult.summary || '',
        fullText: aiResult.fullText || '',
        keyFields: aiResult.keyFields || {},
        embedding: [],
        embeddingGeneratedAt: null,
      }], opts);

      // 2d. Set currentVersionId on Document
      document.currentVersionId = version._id;
      await document.save(opts);

      // 2e. History event
      await DocumentHistory.create([{
        documentId: document._id,
        userId: dbUserId,
        action: 'UPLOAD',
        metadata: {
          filename: file.originalname,
          size: file.size,
          type: file.mimetype,
          aiAnalysisSucceeded: aiSuccess,
          classification,
        }
      }], opts);
    });

    saved = true;
    console.log('[UPLOAD SUCCESS]', { documentId: document._id });

    // 3. Send response immediately (same shape as before — frontend unchanged)
    res.status(201).json({
      message: 'Document uploaded successfully',
      document: serializeDoc(document, content),
      aiAnalysis: {
        success: aiSuccess,
        error: aiSuccess ? null : 'AI analysis did not complete. Your document was saved without AI metadata. You can edit its details manually.'
      }
    });

    // 4. Background: generate and save semantic embedding
    if (aiSuccess) {
      try {
        const textToEmbed = buildSearchableText({
          name: document.name,
          category: document.category,
          tags: document.tags,
          extractedData: { summary: content.summary, fullText: content.fullText, keyFields: content.keyFields }
        });
        const vector = await generateEmbedding(textToEmbed);
        if (vector) {
          await DocumentContent.updateOne(
            { _id: content._id },
            { $set: { embedding: vector, embeddingGeneratedAt: new Date() } }
          );
          console.log(`[EMBEDDING SUCCESS] documentcontents/${content._id}`);
        }
      } catch (err) {
        console.error(`[EMBEDDING BACKGROUND ERROR]`, err.message);
      }
    }

  } catch (error) {
    console.error('[UPLOAD ERROR]', error.message);
    if (!saved && documentId) {
      await Promise.allSettled([Document.deleteOne({ _id: documentId }), DocumentVersion.deleteMany({ documentId }), DocumentContent.deleteMany({ documentId }), DocumentHistory.deleteMany({ documentId })]);
    }
    if (!saved && storedFile) await deleteStoredFile(storedFile).catch(() => {});
    if (!res.headersSent) res.status(500).json({ error: 'Upload failed. Please try again.' });
  } finally {
    if (req.file && (process.env.FILE_STORAGE === 'gridfs' || !saved)) await fs.promises.unlink(req.file.path).catch(() => {});
  }
});

// ─── GET /api/documents ─────────────────────────────────────────────────────
// Returns all documents for the user. Joins summary+keyFields from DocumentContent.
// Never returns fullText or embedding.
router.get('/', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const userId = req.dbUser._id;

    const documents = await Document.find({ userId }).sort({ createdAt: -1 }).lean();
    if (documents.length === 0) return res.status(200).json([]);

    // Batch-fetch all related DocumentContent records
    const docIds = documents.map(d => d._id);
    const contents = await DocumentContent.find(
      { documentId: { $in: docIds } },
      { documentId: 1, summary: 1, keyFields: 1 } // never return fullText or embedding
    ).lean();
    const contentMap = new Map(contents.map(c => [String(c.documentId), c]));

    const result = documents.map(doc => {
      const content = contentMap.get(String(doc._id));
      return {
        ...doc,
        extractedData: content
          ? { summary: content.summary || '', keyFields: content.keyFields || {} }
          : { summary: '', keyFields: {} },
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Fetch Documents Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── PUT /api/documents/:id ──────────────────────────────────────────────────
// Updates document metadata. Re-embeds if searchable fields change.
router.put('/:id', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const { name, category, tags, summary } = req.body;
    if ((name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 255)) ||
        (category !== undefined && (typeof category !== 'string' || category.length > 100)) ||
        (summary !== undefined && (typeof summary !== 'string' || summary.length > 10000)) ||
        (tags !== undefined && (!Array.isArray(tags) || tags.length > 20 || tags.some(tag => typeof tag !== 'string' || tag.length > 100)))) {
      return res.status(400).json({ error: 'Invalid document details' });
    }
    const documentId = req.params.id;
    const dbUserId = req.dbUser._id;

    const document = await Document.findOne({ _id: documentId, userId: dbUserId });
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const content = await DocumentContent.findOne({ documentId: document._id });

    const changes = {};
    let searchableFieldChanged = false;

    if (name && document.name !== name) {
      changes.name = { from: document.name, to: name };
      document.name = name;
      searchableFieldChanged = true;
    }
    if (category && document.category !== category) {
      changes.category = { from: document.category, to: category };
      document.category = category;
      document.classification = { source: 'manual', status: 'user_corrected' };
      searchableFieldChanged = true;
    }
    if (tags && JSON.stringify(document.tags) !== JSON.stringify(tags)) {
      changes.tags = { from: document.tags, to: tags };
      document.tags = tags;
      searchableFieldChanged = true;
    }
    if (summary !== undefined && content) {
      const currentSummary = content.summary || '';
      if (currentSummary !== summary) {
        changes.summary = { from: currentSummary, to: summary };
        content.summary = summary;
        searchableFieldChanged = true;
      }
    }

    if (Object.keys(changes).length === 0) {
      // No changes — return current state with content
      return res.status(200).json({
        message: 'Document updated successfully',
        document: {
          ...document.toObject(),
          extractedData: { summary: content?.summary || '', keyFields: content?.keyFields || {} }
        }
      });
    }

    // Save both in a transaction + write history
    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      await document.save(opts);
      if (content) await content.save(opts);

      await DocumentHistory.create([{
        documentId: document._id,
        userId: dbUserId,
        action: 'EDIT',
        metadata: { changes }
      }], opts);
    });

    res.status(200).json({
      message: 'Document updated successfully',
      document: {
        ...document.toObject(),
        extractedData: { summary: content?.summary || '', keyFields: content?.keyFields || {} }
      }
    });

    // Background: re-embed if any searchable field changed
    if (searchableFieldChanged && content) {
      try {
        const textToEmbed = buildSearchableText({
          name: document.name,
          category: document.category,
          tags: document.tags,
          extractedData: { summary: content.summary, fullText: content.fullText || '', keyFields: content.keyFields }
        });
        const vector = await generateEmbedding(textToEmbed);
        if (vector) {
          await DocumentContent.updateOne(
            { _id: content._id },
            { $set: { embedding: vector, embeddingGeneratedAt: new Date() } }
          );
          console.log(`[RE-EMBED SUCCESS] documentcontents/${content._id}`);
        }
      } catch (embedErr) {
        console.error('[RE-EMBED ERROR]', embedErr.message);
      }
    }

  } catch (error) {
    console.error('Document Update Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── PATCH /api/documents/:id/view ──────────────────────────────────────────
router.patch('/:id/view', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.dbUser._id });
    if (!document) return res.status(404).json({ error: 'Document not found' });
    document.lastViewedAt = new Date();
    await document.save();
    res.status(200).json({ message: 'View recorded' });
  } catch (error) {
    console.error('Record View Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── DELETE /api/documents/:id ───────────────────────────────────────────────
router.delete('/:id', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const documentId = req.params.id;
    const dbUserId = req.dbUser._id;

    const document = await Document.findOne({ _id: documentId, userId: dbUserId });
    if (!document) return res.status(404).json({ error: 'Document not found' });

    const versions = await DocumentVersion.find({ documentId }).lean();
    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      // History event first
      await DocumentHistory.create([{
        documentId: document._id,
        userId: dbUserId,
        action: 'DELETE',
        metadata: { deletedAt: new Date() }
      }], opts);

      // Delete satellite records
      if (session) {
        await DocumentShare.deleteMany({ documentId: document._id }).session(session);
        await DocumentContent.deleteMany({ documentId: document._id }).session(session);
        await DocumentVersion.deleteMany({ documentId: document._id }).session(session);
        await Document.deleteOne({ _id: documentId, userId: dbUserId }).session(session);
      } else {
        await DocumentShare.deleteMany({ documentId: document._id });
        await DocumentContent.deleteMany({ documentId: document._id });
        await DocumentVersion.deleteMany({ documentId: document._id });
        await Document.deleteOne({ _id: documentId, userId: dbUserId });
      }
    });

    for (const version of versions) await deleteStoredFile(version).catch(error => console.error('File cleanup failed:', error.message));

    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Document Delete Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── GET /api/documents/search?q=query ──────────────────────────────────────
// Hybrid: Atlas Vector Search on documentcontents.embedding + keyword regex fallback
router.get('/search', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ error: 'Missing or empty search query' });
    }
    const queryStr = q.trim();
    if (queryStr.length > 200) return res.status(400).json({ error: 'Search query is too long' });
    const dbUserId = req.dbUser._id;

    // ── Keyword fallback (always runs) ───────────────────────────────────────
    const regex = new RegExp(queryStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const keywordDocs = await Document.find({
      userId: dbUserId,
      $or: [
        { name: { $regex: regex } },
        { category: { $regex: regex } },
        { tags: { $regex: regex } },
      ]
    }).select('-embedding').sort({ createdAt: -1 }).limit(10).lean();

    // Also search in DocumentContent summary/fullText
    const ownedIds = await Document.find({ userId: dbUserId }).distinct('_id');
    const contentMatches = await DocumentContent.find({
      documentId: { $in: ownedIds },
      $or: [
        { summary: { $regex: regex } },
        { fullText: { $regex: regex } }
      ]
    }, { documentId: 1 }).lean();

    const contentMatchDocIds = new Set(contentMatches.map(c => String(c.documentId)));

    // Fetch documents for content matches not already in keywordDocs
    const keywordDocIds = new Set(keywordDocs.map(d => String(d._id)));
    const extraDocIds = [...contentMatchDocIds].filter(id => !keywordDocIds.has(id));
    let extraDocs = [];
    if (extraDocIds.length > 0) {
      extraDocs = await Document.find({
        _id: { $in: extraDocIds },
        userId: dbUserId,
      }).select('-embedding').lean();
    }

    const keywordResults = [...keywordDocs, ...extraDocs].slice(0, 10);

    // ── Semantic Vector Search (optional, falls back gracefully) ─────────────
    let semanticResults = [];
    try {
      const queryVector = process.env.ENABLE_VECTOR_SEARCH === 'true' ? await generateEmbedding(queryStr) : null;
      if (queryVector) {
        // Vector search on documentcontents, then join to documents for ownership check
        const vectorContentMatches = await DocumentContent.aggregate([
          {
            $vectorSearch: {
              index: 'vector_index',
              queryVector: queryVector,
              path: 'embedding',
              numCandidates: 100,
              limit: 10,
            }
          },
          { $project: { documentId: 1, summary: 1, keyFields: 1, _id: 0 } }
        ]);

        if (vectorContentMatches.length > 0) {
          const vectorDocIds = vectorContentMatches.map(c => c.documentId);
          // Enforce ownership — only return docs belonging to this user
          const vectorDocs = await Document.find({
            _id: { $in: vectorDocIds },
            userId: dbUserId,
          }).select('-embedding').lean();

          const contentResultMap = new Map(
            vectorContentMatches.map(c => [String(c.documentId), c])
          );
          semanticResults = vectorDocs.map(d => ({
            ...d,
            extractedData: {
              summary: contentResultMap.get(String(d._id))?.summary || '',
              keyFields: contentResultMap.get(String(d._id))?.keyFields || {},
            }
          }));
        }
      }
    } catch (vectorError) {
      console.log('[SEMANTIC SEARCH SKIPPED]', vectorError.message?.substring(0, 150));
    }

    // ── Merge: keyword results first, then semantic results (deduplicated) ───
    const mergedResults = [];
    const seenIds = new Set();

    // Attach content to keyword results
    const kwDocIds = keywordResults.map(d => d._id);
    const kwContents = await DocumentContent.find(
      { documentId: { $in: kwDocIds } },
      { documentId: 1, summary: 1, keyFields: 1 }
    ).lean();
    const kwContentMap = new Map(kwContents.map(c => [String(c.documentId), c]));

    for (const doc of keywordResults) {
      const idStr = String(doc._id);
      if (!seenIds.has(idStr)) {
        const c = kwContentMap.get(idStr);
        mergedResults.push({
          ...doc,
          extractedData: { summary: c?.summary || '', keyFields: c?.keyFields || {} }
        });
        seenIds.add(idStr);
      }
    }

    for (const doc of semanticResults) {
      const idStr = String(doc._id);
      if (!seenIds.has(idStr)) {
        mergedResults.push(doc);
        seenIds.add(idStr);
      }
    }

    res.status(200).json(mergedResults.slice(0, 10));
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── POST /api/documents/:id/chat ────────────────────────────────────────────
router.post('/:id/chat', requireAuth, resolveDbUser, aiLimit, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { message, history = [] } = req.body;
    const dbUserId = req.dbUser._id;

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ error: 'Invalid message' });
    }
    if (!Array.isArray(history) || history.length > 20) {
      return res.status(400).json({ error: 'History too long or invalid format' });
    }
    for (const msg of history) {
      if (!msg || typeof msg !== 'object') return res.status(400).json({ error: 'Invalid history item' });
      if (msg.role !== 'user' && msg.role !== 'assistant') return res.status(400).json({ error: 'Invalid role in history' });
      if (!msg.content || typeof msg.content !== 'string' || msg.content.length > 2000) {
        return res.status(400).json({ error: 'Invalid content in history' });
      }
    }

    const document = await Document.findOne({ _id: documentId, userId: dbUserId });
    if (!document) return res.status(404).json({ error: 'Document not found or unauthorized' });

    // Fetch fullText from DocumentContent (not inline on Document anymore)
    const content = await DocumentContent.findOne({ documentId: document._id }, { fullText: 1 });
    const documentText = content?.fullText || '';

    const mimeType = document.type || 'application/octet-stream';
    const { chatWithDocument } = require('../services/aiService');
    const answer = await withLocalFile(document, filePath => chatWithDocument({ filePath, mimeType, documentText, history, newMessage: message }));
    res.status(200).json({ answer });
  } catch (error) {
    console.error('Chat Error:', error);
    if (error.status === 429) return res.status(429).json({ error: 'AI quota is temporarily exhausted. Your document is saved; please try chat again after the quota resets.' });
    if (error.status === 504) return res.status(504).json({ error: 'AI took too long to answer. Your file is safe. Please try a more specific question.' });
    res.status(502).json({ error: 'The AI service could not answer this question. Your file is safe; please try again shortly.' });
  }
});

// ─── GET /api/documents/:id/history ─────────────────────────────────────────
router.get('/:id/history', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const documentId = req.params.id;
    const dbUserId = req.dbUser._id;

    const document = await Document.findOne({ _id: documentId, userId: dbUserId });
    if (!document) return res.status(404).json({ error: 'Document not found or access denied' });

    const history = await DocumentHistory.find({ documentId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json(history);
  } catch (error) {
    console.error('History Fetch Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── POST /api/documents/:id/shares ─────────────────────────────────────────
router.post('/:id/shares', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const documentId = req.params.id;
    const dbUserId = req.dbUser._id;
    const { expiresIn, permission = 'view', customExpiresAt } = req.body;

    const document = await Document.findOne({ _id: documentId, userId: dbUserId });
    if (!document) return res.status(404).json({ error: 'Document not found or access denied' });

    const selectedPermission = ['view', 'download'].includes(permission) ? permission : 'view';

    let expirationDate = null;
    if (customExpiresAt) {
      expirationDate = new Date(customExpiresAt);
    } else {
      const now = Date.now();
      switch (expiresIn) {
        case '1h':  expirationDate = new Date(now + 60 * 60 * 1000); break;
        case '24h':
        case '1d':  expirationDate = new Date(now + 24 * 60 * 60 * 1000); break;
        case '7d':  expirationDate = new Date(now + 7 * 24 * 60 * 60 * 1000); break;
        case '30d': expirationDate = new Date(now + 30 * 24 * 60 * 60 * 1000); break;
        default:    expirationDate = new Date(now + 24 * 60 * 60 * 1000);
      }
    }

    if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
      return res.status(400).json({ error: 'Expiration date must be a valid future date/time.' });
    }

    // Generate token — only hash is persisted, raw token returned to client once only
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    let share;
    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      [share] = await DocumentShare.create([{
        documentId: document._id,
        ownerId: dbUserId,
        tokenHash,
        expiresAt: expirationDate,
        permission: selectedPermission,
        isActive: true,
        accessCount: 0,
      }], opts);

      await DocumentHistory.create([{
        documentId: document._id,
        userId: dbUserId,
        action: 'SHARE',
        metadata: { shareId: share._id, permission: selectedPermission, expiresAt: expirationDate }
      }], opts);
    });

    res.status(201).json({
      message: 'Share link created successfully',
      share: {
        _id: share._id,
        documentId: share.documentId,
        token: rawToken, // returned only once — never stored in DB
        expiresAt: share.expiresAt,
        permission: share.permission,
        isActive: share.isActive,
        createdAt: share.createdAt
      },
      shareUrl: `${(process.env.PUBLIC_CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://arckiv.web.app' : process.env.CLIENT_URL || 'http://localhost:5173')).replace(/\/$/, '')}/shared/${rawToken}`
    });
  } catch (error) {
    console.error('Create Share Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── GET /api/documents/:id/shares ──────────────────────────────────────────
router.get('/:id/shares', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const documentId = req.params.id;
    const dbUserId = req.dbUser._id;

    const document = await Document.findOne({ _id: documentId, userId: dbUserId });
    if (!document) return res.status(404).json({ error: 'Document not found or access denied' });

    // token field is gone — shares list no longer includes the raw token (by design)
    const shares = await DocumentShare.find({ documentId, ownerId: dbUserId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(shares);
  } catch (error) {
    console.error('Fetch Shares Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── DELETE /api/documents/:id/shares/:shareId ───────────────────────────────
router.delete('/:id/shares/:shareId', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const { id: documentId, shareId } = req.params;
    const dbUserId = req.dbUser._id;

    const share = await DocumentShare.findOne({ _id: shareId, documentId, ownerId: dbUserId });
    if (!share) return res.status(404).json({ error: 'Share link not found or access denied' });

    if (!share.isActive) {
      return res.status(200).json({ message: 'Share is already revoked', share });
    }

    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      share.isActive = false;
      await share.save(opts);

      await DocumentHistory.create([{
        documentId,
        userId: dbUserId,
        action: 'UNSHARE',
        metadata: { shareId: share._id, revokedAt: new Date() }
      }], opts);
    });

    res.status(200).json({ message: 'Share link revoked successfully', share });
  } catch (error) {
    console.error('Revoke Share Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
