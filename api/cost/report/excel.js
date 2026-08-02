'use strict';
const { err, requireAuth } = require('../../_lib/http');
const { INVENTORY_PRODUCTS, INVENTORY_ENTRIES, splitCsv } = require('../../_lib/fixtures');
const { sendXlsx } = require('../../_lib/xlsx');

const ALL_COST_COLS = ['uretim', 'sevkiyat', 'yemekhane', 'online', 'ikram', 'zayii', 'diger', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5'];
const COL_TR = { uretim: 'Üretim', sevkiyat: 'Sevkiyat', yemekhane: 'Yemekhane', online: 'Online', ikram: 'İkram', zayii: 'Zayii', diger: 'Diğer', extra1: 'Ekstra 1', extra2: 'Ekstra 2', extra3: 'Ekstra 3', extra4: 'Ekstra 4', extra5: 'Ekstra 5' };
function round3(v) { return Math.round((v + Number.EPSILON) * 1000) / 1000; }

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { start = '', end = '', view = 'detail' } = req.query;
  const ambarList = splitCsv(req.query.ambar);
  const urunList = splitCsv(req.query.urun);
  const colParam = req.query.columns || '';
  const cols = colParam ? colParam.split(',').filter((c) => ALL_COST_COLS.includes(c)) : ALL_COST_COLS;
  if (!start || !end) return err(res, 400, 'start ve end zorunlu');

  const byId = new Map(INVENTORY_PRODUCTS.map((p) => [p.id, p]));
  const pairs = INVENTORY_ENTRIES.filter((e) => {
    if (e.entry_date < start || e.entry_date > end) return false;
    const p = byId.get(e.product_id);
    if (!p || !p.is_active) return false;
    if (ambarList.length && !ambarList.includes(p.ambar)) return false;
    if (urunList.length && !urunList.includes(p.name)) return false;
    return true;
  }).map((e) => ({ entry: e, product: byId.get(e.product_id) }));

  let rows, sheetName;
  if (view === 'summary') {
    const byProduct = new Map();
    for (const { entry: e, product: p } of pairs) {
      if (!byProduct.has(p.id)) byProduct.set(p.id, { product_name: p.name, ambar: p.ambar, sums: Object.fromEntries(ALL_COST_COLS.map((c) => [c, 0])), lastDate: null, lastKalan: 0 });
      const g = byProduct.get(p.id);
      for (const c of ALL_COST_COLS) g.sums[c] += e[c] || 0;
      if (!g.lastDate || e.entry_date > g.lastDate) { g.lastDate = e.entry_date; g.lastKalan = round3(e.mevcut + e.uretim - e.sevkiyat - e.yemekhane - e.online - e.ikram - e.zayii - e.diger); }
    }
    rows = [...byProduct.values()].map((g) => {
      const rec = { 'Ürün': g.product_name, 'Ambar': g.ambar };
      for (const c of cols) rec[COL_TR[c] || c] = round3(g.sums[c]);
      rec['Son Kalan'] = g.lastKalan;
      return rec;
    });
    sheetName = 'Ürün Özeti';
  } else {
    rows = pairs.map(({ entry: e, product: p }) => {
      const kalan = round3(e.mevcut + e.uretim - e.sevkiyat - e.yemekhane - e.online - e.ikram - e.zayii - e.diger);
      const rec = { 'Ürün': p.name, 'Ambar': p.ambar, 'Tarih': e.entry_date, 'Mevcut': e.mevcut };
      for (const c of cols) rec[COL_TR[c] || c] = e[c] || 0;
      rec['Kalan'] = kalan;
      return rec;
    });
    sheetName = 'Günlük Detay';
  }
  sendXlsx(res, `envanter-rapor-${start}-${end}.xlsx`, [{ name: sheetName, rows }]);
};
