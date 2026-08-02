'use strict';
const { ok, err, requireAuth } = require('./_lib/http');
const { TRANSFERS, round } = require('./_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const docs = new Set(TRANSFERS.map((r) => r.dokuman_no));
  const totalQty = TRANSFERS.reduce((s, r) => s + r.miktar, 0);
  const totalValue = TRANSFERS.reduce((s, r) => s + r.toplam, 0);
  ok(res, { total_docs: docs.size, total_qty: round(totalQty), total_value: round(totalValue) });
};
