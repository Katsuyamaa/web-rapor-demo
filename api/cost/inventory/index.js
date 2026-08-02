'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { INVENTORY_PRODUCTS, INVENTORY_ENTRIES, TRANSFERS } = require('../../_lib/fixtures');

function round3(v) { return Math.round((v + Number.EPSILON) * 1000) / 1000; }

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const dateStr = req.query.date || '2026-08-02';
  const ambar = (req.query.ambar || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return err(res, 400, 'geçersiz tarih (YYYY-MM-DD)');

  let products = INVENTORY_PRODUCTS.filter((p) => p.is_active);
  if (ambar) products = products.filter((p) => p.ambar === ambar);

  const transferMap = new Map();
  for (const t of TRANSFERS) {
    if (t.dokuman_tarihi !== dateStr) continue;
    if (ambar && t.cikis_ambari !== ambar) continue;
    const key = ((t.cikis_ambari || ambar || '').toLowerCase()) + '||' + (t.stok_adi || '').toLowerCase();
    transferMap.set(key, (transferMap.get(key) || 0) + t.miktar);
  }

  let isInitialized = false;
  const entries = products.sort((a, b) => (a.ambar || '').localeCompare(b.ambar || '') || a.sort_order - b.sort_order).map((p) => {
    const e = INVENTORY_ENTRIES.find((x) => x.product_id === p.id && x.entry_date === dateStr);
    if (e) isInitialized = true;
    const base = e || { mevcut: 0, uretim: 0, sevkiyat: 0, yemekhane: 0, online: 0, ikram: 0, zayii: 0, diger: 0, extra1: 0, extra2: 0, extra3: 0, extra4: 0, extra5: 0, notes: null, fr3002_synced: 0, id: null };
    const kalan = round3(base.mevcut + base.uretim - base.sevkiyat - base.yemekhane - base.online - base.ikram - base.zayii - base.diger - (base.extra1 || 0) - (base.extra2 || 0) - (base.extra3 || 0) - (base.extra4 || 0) - (base.extra5 || 0));
    const divisor = parseFloat(p.divisor || 1) || 1;
    const key = ((p.ambar || ambar || '').toLowerCase()) + '||' + (p.name || '').toLowerCase();
    return {
      product_id: p.id, product_name: p.name, unit: p.unit, ambar: p.ambar, divisor,
      id: base.id, entry_date: dateStr, ...base, kalan,
      fr3002_synced: !!base.fr3002_synced,
      sistem_cikisi: round3((transferMap.get(key) || 0) / divisor),
    };
  });

  ok(res, { date: dateStr, ambar: ambar || null, is_initialized: isInitialized, entries });
};
