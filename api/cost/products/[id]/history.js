'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { INVENTORY_ENTRIES } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const pid = parseInt(req.query.id, 10);
  const months = Math.min(parseInt(req.query.months || '3', 10), 12);
  const fromDate = new Date('2026-08-02'); fromDate.setUTCDate(fromDate.getUTCDate() - months * 30);
  const fromStr = fromDate.toISOString().slice(0, 10);
  const rows = INVENTORY_ENTRIES.filter((e) => e.product_id === pid && e.entry_date >= fromStr)
    .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1))
    .map((e) => ({
      ...e, entry_date: e.entry_date,
      kalan: round3((e.mevcut || 0) + (e.uretim || 0) - (e.sevkiyat || 0) - (e.yemekhane || 0) - (e.online || 0) - (e.ikram || 0) - (e.zayii || 0) - (e.diger || 0) - (e.extra1 || 0) - (e.extra2 || 0) - (e.extra3 || 0) - (e.extra4 || 0) - (e.extra5 || 0)),
    }));
  ok(res, rows);
};
function round3(v) { return Math.round((v + Number.EPSILON) * 1000) / 1000; }
