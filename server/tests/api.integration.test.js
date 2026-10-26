const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');

test('isolated HTTP integration', { skip: process.env.RUN_INTEGRATION !== 'true', timeout: 60000 }, async t => {
  const dbName = `arckiv_test_${Date.now()}`;
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arckiv-test-'));
  Object.assign(process.env, { CLASSIFIER_URL: '', FILE_STORAGE: 'gridfs', UPLOAD_DIR: directory, CLIENT_URL: 'https://arckiv-test.web.app', NODE_ENV: 'production', ENABLE_VECTOR_SEARCH: 'false' });
  // Test-process doubles only; deployed authentication is never bypassed.
  const authPath = require.resolve('../src/middleware/auth');
  const User = require('../src/models/User');
  require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
    requireAuth(req, res, next) {
      const uid = req.headers.authorization?.replace('Bearer ', '');
      if (!['owner', 'other', 'admin'].includes(uid)) return res.status(401).json({ error: 'Unauthorized' });
      req.user = { uid, email: uid === 'admin' ? 'abishekvh@gmail.com' : `${uid}@example.test`, name: uid, email_verified: true, arckivAdmin: uid === 'admin' }; next();
    },
    async resolveDbUser(req, res, next) { req.dbUser = await User.findOne({ firebaseUid: req.user.uid }); next(); },
  } };
  const modelId = require('../src/data/modelRegistry.json').configuredModelId;
  const classifierPath = require.resolve('../src/services/classifierService');
  require.cache[classifierPath] = {id:classifierPath,filename:classifierPath,loaded:true,exports:{
    classifyDocument:async text => text ? {source:'ml',status:'predicted',category:'Invoice',predictionCategory:'Invoice',confidence:.9,threshold:.45,modelId,algorithm:'logistic_regression',scores:[{category:'Invoice',score:.9},{category:'Receipt',score:.1}],scoreType:'probability',durationMs:4,reason:'Met threshold'} : {source:'gemini',status:'no_text'}
  }};
  let failAnalysis = false;
  let chatFailureStatus = 0;
  const aiPath = require.resolve('../src/services/aiService');
  require.cache[aiPath] = { id: aiPath, filename: aiPath, loaded: true, exports: {
    async analyzeDocument() { if (failAnalysis) throw new Error('AI timed out'); return { summary: 'Synthetic invoice', category: 'Invoice', tags: ['demo'], fullText: 'Amount 125 rupees', keyFields: { amount: '125' } }; },
    buildSearchableText() { return ''; }, async generateEmbedding() { return null; }, async generateDashboardInsights() { return null; },
    async chatWithDocument({ filePath }) { assert.ok(fs.existsSync(filePath)); if (chatFailureStatus) throw Object.assign(new Error('Provider error'), { status: chatFailureStatus }); return '125 rupees'; },
  } };
  let server;
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017', { dbName, serverSelectionTimeoutMS: 5000 });
    const app = require('../src/app');
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(route, { user = 'owner', method = 'GET', body, headers = {} } = {}) {
      const options = { method, headers: { ...(user ? { Authorization: `Bearer ${user}` } : {}), ...headers }, signal: AbortSignal.timeout(15000) };
      if (body instanceof FormData) options.body = body;
      else if (body !== undefined) { options.body = JSON.stringify(body); options.headers['Content-Type'] = 'application/json'; }
      return fetch(base + route, options);
    }
    const pdf = Buffer.from('%PDF-1.4\nSynthetic test document\n%%EOF');
    function form(type = 'application/pdf', bytes = pdf, name = 'invoice.pdf') { const f = new FormData(); f.append('document', new Blob([bytes], { type }), name); return f; }
    let id;
    await t.test('authentication, CORS, health, account sync', async () => {
      assert.equal((await request('/health', { user: null })).status, 200);
      assert.equal((await request('/api/documents', { user: null })).status, 401);
      assert.equal((await request('/api/documents', { headers: { Origin: 'https://evil.example' } })).status, 403);
      for (const origin of ['https://arckiv.web.app', 'https://arckiv-test.web.app']) {
        const response = await request('/health', { headers: { Origin: origin } });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('access-control-allow-origin'), origin);
      }
      for (const user of ['owner', 'other']) assert.equal((await request('/api/auth/sync', { method: 'POST', user })).status, 200);
      assert.equal((await request('/api/documents/not-an-id/file')).status, 400);
    });
    await t.test('admin rejects anonymous and ordinary users and returns only safe account fields', async () => {
      assert.equal((await request('/api/admin/overview', {user:null})).status,401);
      assert.equal((await request('/api/admin/overview')).status,403);
      const response = await request('/api/admin/overview', {user:'admin'});
      assert.equal(response.status,200);
      const data = await response.json();
      assert.equal(data.totalUsers,2);
      assert.equal(data.evaluation.threshold,0.45);
      assert.ok(data.users.every(u=>!('firebaseUid' in u)&&!('password' in u)));
      assert.equal(data.users[0].documentCount,0);
    });
    await t.test('upload and GridFS persistence across database reconnect', async () => {
      const res = await request('/api/documents/upload', { method: 'POST', body: form() });
      assert.equal(res.status, 201); const data = await res.json(); id = data.document._id;
      assert.equal(data.aiAnalysis.success, true);
      assert.equal(data.document.extractedData.summary, 'Synthetic invoice');
      const file = await request(`/api/documents/${id}/file`);
      assert.equal(file.status, 200); assert.deepEqual(Buffer.from(await file.arrayBuffer()), pdf);
      assert.equal(await mongoose.connection.db.collection('documentFiles.files').countDocuments(), 1);
      await mongoose.disconnect(); await mongoose.connect('mongodb://127.0.0.1:27017', { dbName });
      assert.equal((await request(`/api/documents/${id}/file`)).status, 200);
    });
    await t.test('private originals and cross-user access', async () => {
      assert.equal((await request(`/api/documents/${id}/file`, { user: null })).status, 401);
      assert.equal((await request(`/api/documents/${id}/file`, { user: 'other' })).status, 404);
      assert.equal((await request('/uploads/invoice.pdf', { user: null })).status, 404);
      assert.deepEqual(await (await request('/api/documents', { user: 'other' })).json(), []);
      for (const [route, method, body] of [[`/${id}`, 'PUT', { name: 'stolen' }], [`/${id}`, 'DELETE'], [`/${id}/shares`, 'POST', {}], [`/${id}/chat`, 'POST', { message: 'hello' }]]) {
        assert.equal((await request('/api/documents' + route, { user: 'other', method, body })).status, 404);
      }
    });
    await t.test('monitoring APIs persist real pipeline fields, paginate, validate and enforce authorization', async () => {
      for (const route of ['/api/admin/inferences','/api/admin/analytics','/api/admin/quality','/api/admin/registry']) {
        assert.equal((await request(route)).status,403);
        assert.equal((await request(route,{user:null})).status,401);
      }
      const list=await (await request('/api/admin/inferences?limit=1&source=ml',{user:'admin'})).json();
      assert.equal(list.total,1);assert.equal(list.items.length,1);assert.equal(list.items[0].documentId,id);
      const detail=await (await request('/api/admin/inferences/'+list.items[0]._id,{user:'admin'})).json();
      assert.equal(detail.algorithm,'logistic_regression');assert.equal(detail.scores.length,2);assert.equal(detail.scores[0].score,.9);
      assert.equal(detail.geminiAttempted,true);assert.equal(detail.geminiFallback,false);assert.ok(detail.evaluationVersion);
      assert.equal(detail.confidence,.9);assert.equal(detail.threshold,.45);assert.ok(!('fullText' in detail));assert.ok(!('firebaseUid' in detail.user));
      assert.equal((await request('/api/admin/inferences/'+detail._id,{user:'other'})).status,403);
      assert.equal((await request('/api/admin/inferences/not-an-id',{user:'admin'})).status,400);
      assert.equal((await request('/api/admin/inferences?minConfidence=2',{user:'admin'})).status,400);
      assert.equal((await request('/api/admin/inferences?from=2026-02-30',{user:'admin'})).status,400);
      assert.equal((await (await request('/api/admin/inferences?q=%5B',{user:'admin'})).json()).total,0);
      const analytics=await (await request('/api/admin/analytics',{user:'admin'})).json();
      assert.equal(analytics.totals.records,1);assert.equal(analytics.totals.acceptanceRate,1);assert.equal(analytics.totals.fallbackRate,0);assert.equal(analytics.totalDocuments,1);
      const registry=await (await request('/api/admin/registry',{user:'admin'})).json();
      assert.ok(registry.models.find(m=>m.modelId===modelId).metrics.some(m=>m.algorithm==='linear_svm'));
      assert.equal(registry.health.status,'not_configured');
      assert.equal((await request(`/api/documents/${id}/category-review`,{user:'other',method:'POST',body:{category:'Invoice'}})).status,404);
      assert.equal((await request(`/api/documents/${id}/category-review`,{method:'POST',body:{category:'Wrong'}})).status,409);
      assert.equal((await request(`/api/documents/${id}/category-review`,{method:'POST',body:{category:'Invoice'}})).status,200);
      const quality=await (await request('/api/admin/quality',{user:'admin'})).json();assert.equal(quality.totals.agreementRate,1);assert.equal(quality.totals.productionAccuracy,null);
    });
    await t.test('edit, literal search, history, dashboard, chat', async () => {
      assert.equal((await request(`/api/documents/${id}`, { method: 'PUT', body: { name: 'Test [invoice]', category: 'Finance', summary: 'Edited summary', tags: ['paid'] } })).status, 200);
      assert.equal((await (await request('/api/documents/search?q=%5B')).json()).length, 1);
      assert.equal((await request(`/api/documents/${id}/view`, { method: 'PATCH' })).status, 200);
      assert.ok((await (await request(`/api/documents/${id}/history`)).json()).length >= 2);
      assert.equal((await request('/api/dashboard/stats')).status, 200);
      assert.equal((await request('/api/dashboard/insights')).status, 200);
      assert.equal((await (await request(`/api/documents/${id}/chat`, { method: 'POST', body: { message: 'Amount?' } })).json()).answer, '125 rupees');
      chatFailureStatus = 429;
      const limited = await request(`/api/documents/${id}/chat`, { method: 'POST', body: { message: 'Amount?' } });
      assert.equal(limited.status, 429);
      assert.match((await limited.json()).error, /quota/);
      for (const [status, expected, message] of [[504, 504, /too long/], [500, 502, /AI service/]]) {
        chatFailureStatus = status;
        const failed = await request(`/api/documents/${id}/chat`, { method: 'POST', body: { message: 'Amount?' } });
        assert.equal(failed.status, expected);
        assert.match((await failed.json()).error, message);
      }
      chatFailureStatus = 0;
    });
    await t.test('category corrections preserve original model and use latest review per document', async () => {
      const q=await (await request('/api/admin/quality',{user:'admin'})).json();
      assert.equal(q.totals.reviewed,1);assert.equal(q.totals.corrected,1);assert.equal(q.totals.agreementRate,0);
      assert.equal(q.items[0].originalPrediction,'Invoice');assert.equal(q.items[0].reviewedCategory,'Finance');assert.equal(q.items[0].modelId,modelId);
      assert.equal(q.items[0].verifiedGroundTruth,false);
    });
    await t.test('monitoring persistence failure never breaks a valid upload', async () => {
      const Log=require('../src/models/MlInferenceLog'),create=Log.create;
      Log.create=async()=>{throw Error('Simulated monitoring outage');};
      try {const res=await request('/api/documents/upload',{method:'POST',body:form()});assert.equal(res.status,201);const doc=(await res.json()).document;assert.equal((await request(`/api/documents/${doc._id}/file`)).status,200);await request(`/api/documents/${doc._id}`,{method:'DELETE'});}finally{Log.create=create;}
    });
    await t.test('missing originals return readable JSON without dropping the connection', async () => {
      const versions = mongoose.connection.db.collection('documentversions');
      const version = await versions.findOne({ documentId: new mongoose.Types.ObjectId(id) });
      try {
        for (const storage of [
          { storageProvider: 'local', storageKey: 'missing-original.pdf' },
          { storageProvider: 'gridfs', storageKey: String(new mongoose.Types.ObjectId()) },
        ]) {
          await versions.updateOne({ _id: version._id }, { $set: storage });
          const response = await request(`/api/documents/${id}/file`);
          assert.equal(response.status, 404);
          assert.match((await response.json()).error, /original file is unavailable/);
        }
      } finally {
        await versions.updateOne({ _id: version._id }, { $set: { storageProvider: version.storageProvider, storageKey: version.storageKey } });
      }
    });
    await t.test('share permissions, expiration, revocation', async () => {
      const share = await (await request(`/api/documents/${id}/shares`, { method: 'POST', body: { permission: 'view', expiresIn: '1h' } })).json();
      assert.ok(share.shareUrl.startsWith('https://arckiv.web.app/'));
      const route = `/api/shared/${share.share.token}`;
      assert.equal((await request(route, { user: null })).status, 200);
      assert.equal((await request(route + '/file', { user: null })).status, 200);
      assert.equal((await request(route + '/file?download=1', { user: null })).status, 403);
      assert.equal((await request(`/api/documents/${id}/shares/${share.share._id}`, { method: 'DELETE' })).status, 200);
      assert.equal((await request(route, { user: null })).status, 404);
      const second = await (await request(`/api/documents/${id}/shares`, { method: 'POST', body: { permission: 'download' } })).json();
      assert.equal((await request(`/api/shared/${second.share.token}/file?download=1`, { user: null })).status, 200);
      await require('../src/models/DocumentShare').updateOne({ _id: second.share._id }, { expiresAt: new Date(0) });
      assert.equal((await request(`/api/shared/${second.share.token}`, { user: null })).status, 410);
    });
    await t.test('invalid uploads and size limit', async () => {
      assert.equal((await request('/api/documents/upload', { method: 'POST', body: form('text/html', '<script>bad</script>', 'bad.html') })).status, 400);
      assert.equal((await request('/api/documents/upload', { method: 'POST', body: form('application/pdf', Buffer.alloc(10 * 1024 * 1024 + 1)) })).status, 413);
      assert.equal((await request('/api/documents/upload', { method: 'POST', body: new FormData() })).status, 400);
      assert.equal((await request('/api/documents/upload', { method: 'POST', body: form('application/pdf', '<html>fake PDF</html>') })).status, 400);
      assert.equal((await request(`/api/documents/${id}`, { method: 'PUT', body: { tags: [123] } })).status, 400);
    });
    await t.test('AI failure preserves the upload', async () => {
      failAnalysis = true;
      const res = await request('/api/documents/upload', { method: 'POST', body: form() });
      assert.equal(res.status, 201); const data = await res.json();
      assert.equal(data.aiAnalysis.success, false); assert.equal(data.document.category, 'Uncategorized');
      assert.equal((await request(`/api/documents/${data.document._id}`, { method: 'DELETE' })).status, 200);
    });
    await t.test('delete cascades records and stored files', async () => {
      assert.equal((await request(`/api/documents/${id}`, { method: 'DELETE' })).status, 200);
      for (const collection of ['documents', 'documentcontents', 'documentversions', 'documentshares', 'documentFiles.files', 'documentFiles.chunks']) assert.equal(await mongoose.connection.db.collection(collection).countDocuments(), 0, collection);
      assert.equal((await request(`/api/documents/${id}/file`)).status, 404);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.name === dbName && dbName.startsWith('arckiv_test_')) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
