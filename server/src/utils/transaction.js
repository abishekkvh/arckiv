const mongoose = require('mongoose');

/**
 * Executes a callback within a MongoDB transaction if the deployment supports it
 * (i.e. ReplicaSet or Sharded deployments like MongoDB Atlas).
 * On standalone deployments (like local mongod), it executes the callback without
 * a transaction session so that writes succeed without throwing:
 * "This MongoDB deployment does not support retryable writes."
 *
 * @param {Function} callback - async (session) => { ... }
 * @returns {Promise<any>}
 */
async function withTransaction(callback) {
  const topologyType = mongoose.connection.client?.topology?.description?.type;
  const supportsTransactions =
    topologyType === 'ReplicaSetWithPrimary' || topologyType === 'Sharded';

  if (!supportsTransactions) {
    return await callback(null);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { withTransaction };
