const AuditLog = require('../models/AuditLog');

/**
 * Record an administrative audit log event.
 * Bounded and best-effort; failures do not break the main administrative flow.
 */
async function recordAuditLog({
  adminEmail,
  action,
  targetType,
  targetId = null,
  targetLabel = '',
  details = {},
  status = 'success',
  ipAddress = null,
  timeoutMs = 1500,
}) {
  let timer;
  try {
    await Promise.race([
      AuditLog.create({
        adminEmail: adminEmail || 'unknown@admin',
        action,
        targetType,
        targetId: targetId ? String(targetId) : null,
        targetLabel: targetLabel ? String(targetLabel).slice(0, 255) : '',
        details: typeof details === 'object' && details !== null ? details : { info: details },
        status,
        ipAddress,
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('audit_timeout')), timeoutMs);
      }),
    ]);
    return true;
  } catch (err) {
    console.warn('[AUDIT_LOG_WRITE_FAILED]', err.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { recordAuditLog };
