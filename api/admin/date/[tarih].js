'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { TRANSFERS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'DELETE') return err(res, 405, 'Method not allowed');
  const tarih = req.query.tarih;
  const deleted = TRANSFERS.filter((r) => r.dokuman_tarihi === tarih).length;
  ok(res, { success: true, deleted });
};
