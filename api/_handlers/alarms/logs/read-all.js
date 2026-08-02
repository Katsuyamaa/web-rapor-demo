'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { ALARM_LOGS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  for (const l of ALARM_LOGS) l.is_read = 1;
  ok(res, { success: true });
};
