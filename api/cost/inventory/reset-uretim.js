'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { INVENTORY_ENTRIES } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'PATCH') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const { product_id, date: dateStr } = body;
  if (!product_id || !dateStr) return err(res, 400, 'product_id ve date gerekli');
  const entry = INVENTORY_ENTRIES.find((e) => e.product_id === product_id && e.entry_date === dateStr);
  if (entry) entry.uretim = 0;
  ok(res, { ok: true });
};
