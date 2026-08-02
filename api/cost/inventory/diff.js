'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { INVENTORY_ENTRIES, INVENTORY_PRODUCTS, TRANSFERS } = require('../../_lib/fixtures');

function round3(v) { return Math.round((v + Number.EPSILON) * 1000) / 1000; }

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const dateStr = req.query.date || '2026-08-02';
  const threshold = parseFloat(req.query.threshold || '50');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return err(res, 400, 'geçersiz tarih');

  const productsById = new Map(INVENTORY_PRODUCTS.map((p) => [p.id, p]));
  const transferMap = new Map();
  for (const t of TRANSFERS.filter((x) => x.dokuman_tarihi === dateStr)) {
    const key = (t.cikis_ambari || '').toLowerCase() + '||' + (t.stok_adi || '').toLowerCase();
    transferMap.set(key, round3((transferMap.get(key) || 0) + t.miktar));
  }

  const items = [];
  for (const e of INVENTORY_ENTRIES.filter((x) => x.entry_date === dateStr)) {
    const p = productsById.get(e.product_id);
    if (!p || !p.is_active) continue;
    const kalan = round3(e.mevcut + e.uretim - e.sevkiyat - e.yemekhane - e.online - e.ikram - e.zayii - e.diger);
    const key = (p.ambar || '').toLowerCase() + '||' + (p.name || '').toLowerCase();
    const sistemCikisi = transferMap.get(key) || 0;
    const sevkiyatFark = round3(sistemCikisi - (e.sevkiyat || 0));
    const isLow = kalan <= threshold;
    const hasDiff = Math.abs(sevkiyatFark) >= 0.01;
    if (isLow || hasDiff) {
      items.push({ ...e, product_name: p.name, unit: p.unit, ambar: p.ambar, kalan, fr3002_synced: !!e.fr3002_synced, sistem_cikisi: sistemCikisi, sevkiyat_fark: sevkiyatFark, is_low: isLow, has_diff: hasDiff });
    }
  }
  ok(res, { date: dateStr, threshold, items });
};
