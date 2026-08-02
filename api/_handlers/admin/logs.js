'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { SYSTEM_LOGS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { type = '', category = '', date = '' } = req.query;
  let limit = parseInt(req.query.limit || '100', 10);
  if (Number.isNaN(limit)) limit = 100;
  limit = Math.min(limit, 1000);
  let data = SYSTEM_LOGS.slice();
  if (type) data = data.filter((l) => l.log_type === type);
  if (category) data = data.filter((l) => l.category === category);
  if (date) data = data.filter((l) => l.created_at.slice(0, 10) === date);
  data = data.slice().reverse().slice(0, limit);
  ok(res, { success: true, data });
};
