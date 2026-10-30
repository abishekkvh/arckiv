const express = require('express');
const router = express.Router();
const { requireAuth, resolveDbUser } = require('../middleware/auth');
const Document = require('../models/Document');
const DocumentHistory = require('../models/DocumentHistory');
const { generateDashboardInsights } = require('../services/aiService');

// In-memory cache for AI insights with 15-minute TTL
// Key: userId -> { timestamp: number, insights: string[] }
const insightsCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// GET /api/dashboard/stats
// Aggregates storage, category, file type, tag analytics, recent activity, and expiring documents for the authenticated user
router.get('/stats', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const userId = req.dbUser._id; // MongoDB ObjectId

    // Run all 6 independent DB queries in parallel for maximum speed
    const [
      overviewAgg,
      categoriesAgg,
      fileTypesAgg,
      tagsAgg,
      historyRecords,
      expiringDocs,
    ] = await Promise.all([
      // 1. Overview (total docs + total storage)
      Document.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalDocuments: { $sum: 1 }, totalStorageBytes: { $sum: '$size' } } },
      ]),

      // 2. Category Distribution
      Document.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: {
              $cond: [
                { $or: [{ $eq: ['$category', null] }, { $eq: ['$category', ''] }] },
                'Uncategorized',
                '$category',
              ],
            },
            count: { $sum: 1 },
            sizeBytes: { $sum: '$size' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // 3. File Types Distribution
      Document.aggregate([
        { $match: { userId } },
        {
          $project: {
            fileType: {
              $cond: [
                { $regexMatch: { input: { $ifNull: ['$type', ''] }, regex: /pdf/i } },
                'PDF',
                {
                  $cond: [
                    { $regexMatch: { input: { $ifNull: ['$type', ''] }, regex: /image|png|jpeg|jpg|webp/i } },
                    'Image',
                    {
                      $cond: [
                        { $regexMatch: { input: { $ifNull: ['$type', ''] }, regex: /word|docx|doc/i } },
                        'DOCX',
                        'Other',
                      ],
                    },
                  ],
                },
              ],
            },
            size: '$size',
          },
        },
        { $group: { _id: '$fileType', count: { $sum: 1 }, sizeBytes: { $sum: '$size' } } },
        { $sort: { count: -1 } },
      ]),

      // 4. Tagging Analytics (Top 10)
      Document.aggregate([
        { $match: { userId, tags: { $exists: true, $ne: [] } } },
        { $unwind: '$tags' },
        { $match: { tags: { $ne: '' } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // 5. Recent Activity
      DocumentHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('documentId', 'name type')
        .lean(),

      // 6. Expiring Documents
      Document.find({ userId, expiryDate: { $ne: null, $exists: true } })
        .sort({ expiryDate: 1 })
        .limit(5)
        .select('name category expiryDate size type')
        .lean(),
    ]);

    const totalDocuments = overviewAgg[0]?.totalDocuments || 0;
    const totalStorageBytes = overviewAgg[0]?.totalStorageBytes || 0;
    const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);
    const totalStorageGB = (totalStorageBytes / (1024 * 1024 * 1024)).toFixed(3);

    const categories = categoriesAgg.map(c => ({
      name: c._id || 'Uncategorized',
      count: c.count,
      sizeBytes: c.sizeBytes || 0,
      sizeMB: ((c.sizeBytes || 0) / (1024 * 1024)).toFixed(2),
    }));

    const fileTypes = fileTypesAgg.map(f => ({
      type: f._id,
      count: f.count,
      sizeBytes: f.sizeBytes || 0,
      sizeMB: ((f.sizeBytes || 0) / (1024 * 1024)).toFixed(2),
    }));

    const topTags = tagsAgg.map(t => ({ name: t._id, count: t.count }));

    const recentActivity = historyRecords.map(h => {
      const docName = h.documentId?.name || h.metadata?.filename || 'Document';
      return {
        _id: h._id,
        action: h.action,
        documentId: h.documentId?._id || h.documentId,
        documentName: docName,
        metadata: h.metadata || {},
        createdAt: h.createdAt,
      };
    });

    const expiringDocuments = expiringDocs.map(d => ({
      _id: d._id,
      name: d.name,
      category: d.category || 'Uncategorized',
      expiryDate: d.expiryDate,
      isExpired: new Date() > new Date(d.expiryDate),
    }));

    // Cached AI Insights (served instantly; /insights generates them async)
    let aiInsights = [];
    const cached = insightsCache.get(String(userId));
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      aiInsights = cached.insights;
    }

    res.status(200).json({
      overview: {
        totalDocuments,
        totalStorageBytes,
        totalStorageMB: parseFloat(totalStorageMB),
        totalStorageGB: parseFloat(totalStorageGB),
      },
      categories,
      fileTypes,
      tags: topTags,
      recentActivity,
      expiringDocuments,
      aiInsights,
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/dashboard/insights
// Asynchronously generates or refreshes AI analytics observations
router.get('/insights', requireAuth, resolveDbUser, async (req, res) => {
  try {
    const userId = req.dbUser._id; // MongoDB ObjectId
    const forceRefresh = req.query.refresh === 'true';

    // Check cache unless force-refresh requested
    const cached = insightsCache.get(String(userId));
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.status(200).json({
        insights: cached.insights,
        cached: true,
        generatedAt: new Date(cached.timestamp)
      });
    }

    // Aggregate key stats for AI context
    const overviewAgg = await Document.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalStorageBytes: { $sum: '$size' }
        }
      }
    ]);

    const totalDocuments = overviewAgg[0]?.totalDocuments || 0;
    if (totalDocuments === 0) {
      const emptyInsights = [
        "Welcome to Arckiv! Upload your first document to unlock automated AI categorization, OCR indexing, and analytics.",
        "Arckiv automatically indexes files with 3072-dimensional vector embeddings for instant semantic search."
      ];
      return res.status(200).json({ insights: emptyInsights, cached: false, generatedAt: new Date() });
    }

    const totalStorageMB = ((overviewAgg[0]?.totalStorageBytes || 0) / (1024 * 1024)).toFixed(1);

    const categoriesAgg = await Document.aggregate([
      { $match: { userId } },
      { $group: { _id: { $ifNull: ['$category', 'Uncategorized'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 4 }
    ]);
    const categories = categoriesAgg.map(c => ({ name: c._id, count: c.count }));

    const fileTypesAgg = await Document.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ['$type', ''] }, regex: /pdf/i } },
              'PDF',
              { $cond: [{ $regexMatch: { input: { $ifNull: ['$type', ''] }, regex: /image|png|jpeg|jpg/i } }, 'Image', 'Other'] }
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);
    const fileTypes = fileTypesAgg.map(f => ({ type: f._id, count: f.count }));

    const tagsAgg = await Document.aggregate([
      { $match: { userId, tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const topTags = tagsAgg.map(t => ({ name: t._id, count: t.count }));

    const expiringCount = await Document.countDocuments({
      userId,
      expiryDate: { $ne: null, $gt: new Date() }
    });

    const statsPayload = {
      totalDocuments,
      totalStorageMB,
      categories,
      fileTypes,
      topTags,
      expiringCount
    };

    // Call Gemini via aiService
    let insights = await generateDashboardInsights(statsPayload);

    // Heuristic fallback if Gemini fails or quota is unavailable
    if (!insights || insights.length === 0) {
      const topCat = categories[0] ? `${categories[0].name} (${categories[0].count} files)` : 'Uncategorized';
      const dominantType = fileTypes.sort((a, b) => b.count - a.count)[0]?.type || 'Document';
      insights = [
        `${dominantType} format constitutes the majority of your collection with ${totalDocuments} total files.`,
        `Your primary organizational category is ${topCat}.`,
        `Total active storage footprint is ${totalStorageMB} MB across all indexed files.`
      ];
    }

    // Save to cache (use string key for Map since ObjectId is not primitive)
    insightsCache.set(String(userId), {
      timestamp: Date.now(),
      insights
    });

    res.status(200).json({
      insights,
      cached: false,
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Generate Insights Error:', error);
    res.status(200).json({
      insights: [
        "AI insights temporarily unavailable. All statistical analytics remain active."
      ],
      cached: false
    });
  }
});

module.exports = router;
