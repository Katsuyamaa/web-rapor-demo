'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { INVENTORY_ENTRIES, INVENTORY_PRODUCTS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const dateStr = req.query.date || '2026-08-02';
  const ambar = (req.query.ambar || '').trim();
  const prevDate = new Date(dateStr); prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const prevStr = prevDate.toISOString().slice(0, 10);
  const prevKalan = new Map();
  for (const e of INVENTORY_ENTRIES.filter((x) => x.entry_date === prevStr)) {
    prevKalan.set(e.product_id, e.mevcut + e.uretim - e.sevkiyat - e.yemekhane - e.online - e.ikram - e.zayii - e.diger);
  }
  if (!prevKalan.size) return err(res, 404, `${prevStr} tarihinde kayıt bulunamadı`);

  const productIds = new Set(INVENTORY_PRODUCTS.filter((p) => (!ambar || p.ambar === ambar) && p.is_active).map((p) => p.id));
  let updated = 0;
  for (const e of INVENTORY_ENTRIES.filter((x) => x.entry_date === dateStr && productIds.has(x.product_id))) {
    if (prevKalan.has(e.product_id)) { e.mevcut = prevKalan.get(e.product_id); updated++; }
  }
  ok(res, { ok: true, updated });
};
