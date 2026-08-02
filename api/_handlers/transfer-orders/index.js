'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { TRANSFER_ORDERS, splitCsv } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { start = '', end = '', branch = '', stok = '' } = req.query;
  const brVals = splitCsv(branch);
  const stokVals = splitCsv(stok);
  const rows = TRANSFER_ORDERS.filter((r) => {
    if (start && r.order_date < start) return false;
    if (end && r.order_date > end) return false;
    if (brVals.length && !brVals.includes(r.giris_ambari)) return false;
    if (stokVals.length && !stokVals.includes(r.stok_adi)) return false;
    return true;
  });
  ok(res, { success: true, data: rows });
};
