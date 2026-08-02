'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { filterTransfers } = require('../_lib/fixtures');
const { ambarAkis, AMBAR_AKIS_DIMS } = require('../_lib/analytics');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const rowBy = req.query.row_by || 'tarih_ay';
  const colBy = req.query.col_by || 'cikis_ambari';
  if (!AMBAR_AKIS_DIMS[rowBy] || !AMBAR_AKIS_DIMS[colBy]) return err(res, 400, 'Geçersiz boyut parametresi');
  if (rowBy === colBy) return err(res, 400, 'Satır ve sütun boyutu aynı olamaz');
  ok(res, ambarAkis(rowBy, colBy, filterTransfers(req.query)));
};
