'use strict';
const { ok, err, requireAuth } = require('./_lib/http');
const { ciroKarsilastirma } = require('./_lib/analytics');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { granularity = 'ay', ambarlar = '', start = '', end = '' } = req.query;
  try {
    ok(res, ciroKarsilastirma(granularity, ambarlar, start, end));
  } catch (e) {
    err(res, 400, 'Geçersiz tarih formatı (YYYY-MM-DD)');
  }
};
