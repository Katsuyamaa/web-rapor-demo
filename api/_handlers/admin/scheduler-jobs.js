'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  ok(res, { running: true, jobs: [{ id: 'daily_fetch', next_run_time: null, trigger: 'cron[hour=2, minute=0]' }] });
};
