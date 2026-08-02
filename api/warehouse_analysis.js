'use strict';
const { ok, err, requireAuth } = require('./_lib/http');
const { warehouseAnalysisLogic } = require('./_lib/analytics');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { warehouse = '', start = '', end = '', giris = '', stok = '' } = req.query;
  const results = warehouseAnalysisLogic(warehouse, start, end, giris, stok);
  ok(res, {
    success: true,
    warehouses: results,
    warehouse: results.length ? results[0].warehouse : 'Tüm Ambarlar',
    summary: results.length ? results[0].summary : {},
    data: results.length ? results[0].data : [],
  });
};
