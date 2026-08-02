'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { TRANSFER_ORDERS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  ok(res, {
    branches: [...new Set(TRANSFER_ORDERS.map((r) => r.giris_ambari))].sort(),
    stoks: [...new Set(TRANSFER_ORDERS.map((r) => r.stok_adi))].sort(),
  });
};
