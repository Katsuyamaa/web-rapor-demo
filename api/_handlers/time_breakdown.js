'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { filterTransfers } = require('../_lib/fixtures');
const { timeBreakdown } = require('../_lib/analytics');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const groupBy = req.query.group_by || 'gun';
  if (!['gun', 'hafta', 'ay'].includes(groupBy)) return err(res, 400, 'Geçersiz group_by değeri');
  const { start = '', end = '' } = req.query;
  if (!start || !end) return err(res, 400, 'start ve end parametreleri zorunludur');
  const rows = filterTransfers(req.query);
  const data = timeBreakdown(rows, groupBy);
  ok(res, { data, group_by: groupBy, total_count: data.length });
};
