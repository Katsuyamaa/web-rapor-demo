'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { INVENTORY_PRODUCTS, INVENTORY_ENTRIES, splitCsv } = require('../../_lib/fixtures');

const ALL_COST_COLS = ['uretim', 'sevkiyat', 'yemekhane', 'online', 'ikram', 'zayii', 'diger', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5'];
function round3(v) { return Math.round((v + Number.EPSILON) * 1000) / 1000; }

function buildRows(start, end, ambarList, urunList) {
  const byId = new Map(INVENTORY_PRODUCTS.map((p) => [p.id, p]));
  return INVENTORY_ENTRIES.filter((e) => {
    if (e.entry_date < start || e.entry_date > end) return false;
    const p = byId.get(e.product_id);
    if (!p || !p.is_active) return false;
    if (ambarList.length && !ambarList.includes(p.ambar)) return false;
    if (urunList.length && !urunList.includes(p.name)) return false;
    return true;
  }).map((e) => ({ entry: e, product: byId.get(e.product_id) }));
}

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return err(res, 400, 'Geçersiz tarih formatı (YYYY-MM-DD)');

  const pairs = buildRows(start, end, ambarList, urunList);

  if (view === 'summary') {
    const byProduct = new Map();
    for (const { entry: e, product: p } of pairs) {
      const key = p.id;
      if (!byProduct.has(key)) byProduct.set(key, { product_name: p.name, ambar: p.ambar, sums: Object.fromEntries(ALL_COST_COLS.map((c) => [c, 0])), lastDate: null, lastKalan: 0 });
      const g = byProduct.get(key);
      for (const c of ALL_COST_COLS) g.sums[c] += e[c] || 0;
      if (!g.lastDate || e.entry_date > g.lastDate) {
        g.lastDate = e.entry_date;
        g.lastKalan = round3(e.mevcut + e.uretim - e.sevkiyat - e.yemekhane - e.online - e.ikram - e.zayii - e.diger - (e.extra1 || 0) - (e.extra2 || 0) - (e.extra3 || 0) - (e.extra4 || 0) - (e.extra5 || 0));
      }
    }
    const data = [...byProduct.values()].sort((a, b) => a.ambar.localeCompare(b.ambar) || a.product_name.localeCompare(b.product_name)).map((g) => {
      const row = { product_name: g.product_name, ambar: g.ambar, son_kalan: g.lastKalan };
      for (const c of cols) row[c] = round3(g.sums[c]);
      return row;
    });
    return ok(res, { view: 'summary', data });
  }

  const data = pairs.sort((a, b) => a.product.ambar.localeCompare(b.product.ambar) || a.product.name.localeCompare(b.product.name) || (a.entry.entry_date < b.entry.entry_date ? -1 : 1))
    .map(({ entry: e, product: p }) => {
      const kalan = round3(e.mevcut + e.uretim - e.sevkiyat - e.yemekhane - e.online - e.ikram - e.zayii - e.diger - (e.extra1 || 0) - (e.extra2 || 0) - (e.extra3 || 0) - (e.extra4 || 0) - (e.extra5 || 0));
      const row = { product_name: p.name, ambar: p.ambar, entry_date: e.entry_date, mevcut: e.mevcut, kalan };
      for (const c of cols) row[c] = e[c] || 0;
      return row;
    });
  ok(res, { view: 'detail', data });
};
