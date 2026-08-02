'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { SCHEDULER_CONFIG } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  ok(res, { success: true, last_run: SCHEDULER_CONFIG.last_run, last_status: SCHEDULER_CONFIG.last_status });
};
