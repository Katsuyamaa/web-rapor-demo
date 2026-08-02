'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { INVENTORY_PRODUCTS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'PATCH') return err(res, 405, 'Method not allowed');
  const product = INVENTORY_PRODUCTS.find((p) => p.id === parseInt(req.query.id, 10));
  if (!product) return err(res, 404, 'Ürün bulunamadı');
  product.is_active = 1;
  ok(res, { ok: true });
};
