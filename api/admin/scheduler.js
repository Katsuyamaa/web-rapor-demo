'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');
const { SCHEDULER_CONFIG } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method === 'GET') return ok(res, SCHEDULER_CONFIG);
  if (req.method === 'POST') {
    const body = await readBody(req);
    Object.assign(SCHEDULER_CONFIG, {
      enabled: !!body.enabled, hour: body.hour ?? 2, minute: body.minute ?? 0,
      interval_minutes: Math.max(0, parseInt(body.interval_minutes || 0, 10)),
    });
    return ok(res, { success: true });
  }
  err(res, 405, 'Method not allowed');
};
