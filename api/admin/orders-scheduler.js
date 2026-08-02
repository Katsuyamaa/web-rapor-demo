'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');
const { ORDERS_SCHEDULER_CONFIG } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method === 'GET') return ok(res, ORDERS_SCHEDULER_CONFIG);
  if (req.method === 'POST') {
    const body = await readBody(req);
    Object.assign(ORDERS_SCHEDULER_CONFIG, {
      enabled: !!body.enabled,
      interval_minutes: Math.max(1, Math.min(60, parseInt(body.interval_minutes || 5, 10))),
      cutoff_hour: Math.max(0, Math.min(23, parseInt(body.cutoff_hour || 17, 10))),
      cutoff_minute: Math.max(0, Math.min(59, parseInt(body.cutoff_minute || 0, 10))),
    });
    return ok(res, { success: true });
  }
  err(res, 405, 'Method not allowed');
};
