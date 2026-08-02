'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { INVENTORY_PRODUCTS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const ambar = (req.query.ambar || '').trim();
  let rows = INVENTORY_PRODUCTS.filter((p) => p.is_active);
  if (ambar) rows = rows.filter((p) => p.ambar === ambar);
  ok(res, { products: [...new Set(rows.map((p) => p.name))].sort() });
};
