'use strict';
const { ok, err, readBody, requireAuth } = require('../../../../_lib/http');
const { DIST_TEMPLATE_PRODUCTS } = require('../../../../_lib/fixtures');

module.exports = async (req, res) => {
  const id = parseInt(req.query.id, 10);

  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    return ok(res, { data: DIST_TEMPLATE_PRODUCTS[id] || [] });
  }

  if (req.method === 'PUT') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const body = await readBody(req);
    const products = body.products || [];
    DIST_TEMPLATE_PRODUCTS[id] = products.map((p, i) => ({ id: i + 1, product_name: p.product_name, sort_order: p.sort_order ?? i }));
    return ok(res, { success: true });
  }

  err(res, 405, 'Method not allowed');
};
