const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const mongoose = require('mongoose');
const DocumentVersion = require('../models/DocumentVersion');
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));
fs.mkdirSync(uploadDir, { recursive: true });
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documentFiles' });

async function persistFile(file) {
  if (process.env.FILE_STORAGE !== 'gridfs') {
    return { storagePath: file.path, storageKey: file.filename, storageProvider: 'local' };
  }
  const stream = bucket().openUploadStream(file.originalname, { metadata: { contentType: file.mimetype } });
  try {
    await pipeline(fs.createReadStream(file.path), stream);
  } catch (error) {
    await bucket().delete(stream.id).catch(() => {});
    throw error;
  }
  return { storagePath: String(stream.id), storageKey: String(stream.id), storageProvider: 'gridfs' };
}

async function versionFor(document) {
  const version = document.currentVersionId && await DocumentVersion.findById(document.currentVersionId).lean();
  if (version) return version;
  const filename = document.url?.split('/uploads/')[1];
  if (!filename || path.basename(filename) !== filename) throw Object.assign(new Error('File not found'), { status: 404 });
  return { storageProvider: 'local', storageKey: filename };
}
function localPath(version) {
  // Resolve keys under the configured upload directory, never arbitrary stored paths.
  const key = path.basename(version.storageKey);
  return path.join(uploadDir, key);
}
async function streamDocument(document, res, download = false) {
  const version = await versionFor(document);
  const source = version.storageProvider === 'gridfs'
    ? bucket().openDownloadStream(new mongoose.Types.ObjectId(version.storageKey))
    : fs.createReadStream(localPath(version));
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.type(document.type || 'application/octet-stream');
  const name = encodeURIComponent(document.name);
  res.set('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${name}"; filename*=UTF-8''${name}`);
  try { await pipeline(source, res); }
  catch (error) { if (!res.headersSent && !res.destroyed) res.status(404).json({ error: 'Document file unavailable' }); }
}
async function withLocalFile(document, callback) {
  const version = await versionFor(document);
  if (version.storageProvider !== 'gridfs') return callback(localPath(version));
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'arckiv-'));
  const file = path.join(directory, 'document');
  try {
    await pipeline(bucket().openDownloadStream(new mongoose.Types.ObjectId(version.storageKey)), fs.createWriteStream(file));
    return await callback(file);
  } finally { await fs.promises.rm(directory, { recursive: true, force: true }); }
}
async function deleteStoredFile(version) {
  if (version.storageProvider === 'gridfs') await bucket().delete(new mongoose.Types.ObjectId(version.storageKey));
  else await fs.promises.unlink(localPath(version)).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
module.exports = { uploadDir, persistFile, streamDocument, withLocalFile, deleteStoredFile };
