'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { ORDERS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  ok(res, {
    warehouses: [...new Set(ORDERS.map((r) => r.warehouse))].sort(),
    branches: [...new Set(ORDERS.map((r) => r.branch))].sort(),
  });
};
