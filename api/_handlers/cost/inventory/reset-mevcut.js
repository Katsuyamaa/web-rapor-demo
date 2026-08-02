'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { INVENTORY_ENTRIES, INVENTORY_PRODUCTS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'PATCH') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const { date: dateStr, product_id, ambar } = body;
  if (!dateStr || (!product_id && !ambar)) return err(res, 400, 'date ve (product_id veya ambar) gerekli');
  if (product_id) {
    for (const e of INVENTORY_ENTRIES.filter((x) => x.product_id === product_id && x.entry_date === dateStr)) e.mevcut = 0;
  } else {
    const ids = new Set(INVENTORY_PRODUCTS.filter((p) => p.ambar === ambar).map((p) => p.id));
    for (const e of INVENTORY_ENTRIES.filter((x) => ids.has(x.product_id) && x.entry_date === dateStr)) e.mevcut = 0;
  }
  ok(res, { ok: true });
};
