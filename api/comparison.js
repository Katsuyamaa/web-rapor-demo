'use strict';
const { ok, err, requireAuth } = require('./_lib/http');
const { comparison } = require('./_lib/analytics');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { start1 = '', end1 = '', start2 = '', end2 = '', cikis = '', giris = '', stok = '' } = req.query;
  if (!start1 || !end1 || !start2 || !end2) return err(res, 400, 'start1, end1, start2, end2 parametreleri zorunludur');
  for (const v of [start1, end1, start2, end2]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return err(res, 400, `Geçersiz bir tarih değil (YYYY-MM-DD)`);
  }
  ok(res, comparison(start1, end1, start2, end2, cikis, giris, stok));
};
