'use strict';
const { ok, err, readBody, requireAuth } = require('../../../../_lib/http');
const { INVENTORY_PRODUCTS } = require('../../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'PATCH') return err(res, 405, 'Method not allowed');
  const product = INVENTORY_PRODUCTS.find((p) => p.id === parseInt(req.query.id, 10));
  if (!product) return err(res, 404, 'Ürün bulunamadı');
  const body = await readBody(req);
  const dv = Math.round(Math.max(0.0001, parseFloat(body.divisor ?? 1)) * 10000) / 10000;
  product.divisor = dv;
  ok(res, { ok: true, divisor: dv });
};
