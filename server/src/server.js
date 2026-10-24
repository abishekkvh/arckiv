require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const app = require('./app');
async function start() {
  if (process.env.NODE_ENV === 'production' && (!process.env.CLIENT_URL || process.env.FILE_STORAGE !== 'gridfs')) {
    throw new Error('Production requires CLIENT_URL and FILE_STORAGE=gridfs for persistent uploads.');
  }
  await connectDB();
  const server = app.listen(process.env.PORT || 5001, '0.0.0.0', () => console.log(`Server running on port ${process.env.PORT || 5001}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10000).unref();
  });
}
start().catch(error => { console.error('Startup failed:', error.message); process.exit(1); });
