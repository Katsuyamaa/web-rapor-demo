'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { INVENTORY_PRODUCTS, INVENTORY_ENTRIES } = require('../../../_lib/fixtures');

let seq = Math.max(0, ...INVENTORY_ENTRIES.map((e) => e.id)) + 1;

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const dateStr = req.query.date || '2026-08-02';
  const ambar = (req.query.ambar || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return err(res, 400, 'geçersiz tarih (YYYY-MM-DD)');

  let products = INVENTORY_PRODUCTS.filter((p) => p.is_active);
  if (ambar) products = products.filter((p) => p.ambar === ambar);

  const prevDate = new Date(dateStr); prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const prevStr = prevDate.toISOString().slice(0, 10);
  const prevKalan = new Map();
  for (const e of INVENTORY_ENTRIES.filter((x) => x.entry_date === prevStr)) {
    prevKalan.set(e.product_id, e.mevcut + e.uretim - e.sevkiyat - e.yemekhane - e.online - e.ikram - e.zayii - e.diger);
  }

  let count = 0;
  for (const p of products) {
    if (INVENTORY_ENTRIES.some((x) => x.entry_date === dateStr && x.product_id === p.id)) continue;
    INVENTORY_ENTRIES.push({
      id: seq++, entry_date: dateStr, product_id: p.id, mevcut: prevKalan.get(p.id) || 0,
      uretim: 0, sevkiyat: 0, yemekhane: 0, online: 0, ikram: 0, zayii: 0, diger: 0,
      extra1: 0, extra2: 0, extra3: 0, extra4: 0, extra5: 0, notes: null, fr3002_synced: 0,
    });
    count++;
  }
  ok(res, { ok: true, created: count });
};
