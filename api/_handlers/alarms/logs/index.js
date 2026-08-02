'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { ALARM_LOGS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  let rows = ALARM_LOGS.slice();
  if (req.query.unread === 'true') rows = rows.filter((r) => !r.is_read);
  rows = rows.slice().reverse().slice(0, 200);
  ok(res, { data: rows, count: rows.length });
};
