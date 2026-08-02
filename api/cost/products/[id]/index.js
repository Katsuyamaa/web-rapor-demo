'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { INVENTORY_PRODUCTS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  const id = parseInt(req.query.id, 10);
  const product = INVENTORY_PRODUCTS.find((p) => p.id === id);
  if (!product) return err(res, 404, 'Ürün bulunamadı');

  if (req.method === 'PUT') {
    const body = await readBody(req);
    if (body.name) product.name = String(body.name).trim();
    if (body.unit) product.unit = String(body.unit).trim().slice(0, 50);
    if (body.ambar) product.ambar = String(body.ambar).trim().slice(0, 100);
    if ('sort_order' in body) product.sort_order = body.sort_order;
    if ('divisor' in body) {
      const dv = parseFloat(body.divisor);
      product.divisor = Number.isFinite(dv) ? Math.round(Math.max(0.0001, dv) * 10000) / 10000 : 1;
    }
    return ok(res, { ok: true });
  }

  if (req.method === 'DELETE') {
    product.is_active = 0;
    return ok(res, { ok: true });
  }

  err(res, 405, 'Method not allowed');
};
