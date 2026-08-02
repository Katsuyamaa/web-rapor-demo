'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { ORDERS, splitCsv } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { start = '', end = '', warehouse = '', branch = '' } = req.query;
  const whVals = splitCsv(warehouse);
  const brVals = splitCsv(branch);
  let rows = ORDERS.filter((r) => {
    if (start && r.order_date < start) return false;
    if (end && r.order_date > end) return false;
    if (whVals.length && !whVals.includes(r.warehouse)) return false;
    if (brVals.length && !brVals.includes(r.branch)) return false;
    return true;
  });
  rows = rows.slice().sort((a, b) => (a.order_date < b.order_date ? 1 : a.order_date > b.order_date ? -1 : b.id - a.id));
  ok(res, { success: true, data: rows });
};
