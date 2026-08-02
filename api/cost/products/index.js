'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { INVENTORY_PRODUCTS } = require('../../_lib/fixtures');

let seq = INVENTORY_PRODUCTS.length + 1;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const ambar = (req.query.ambar || '').trim();
    const showArchived = req.query.show_archived === 'true';
    let rows = INVENTORY_PRODUCTS.filter((p) => showArchived || p.is_active);
    if (ambar) rows = rows.filter((p) => p.ambar === ambar);
    rows = rows.slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    return ok(res, rows.map((p) => ({ ...p, divisor: parseFloat(p.divisor || 1) })));
  }

  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const body = await readBody(req);
    const name = (body.name || '').trim();
    if (!name) return err(res, 400, 'name zorunlu');
    const unit = (body.unit || 'ADET').trim() || 'ADET';
    const ambar = (body.ambar || 'CHEESECAKE AMBARI').trim() || 'CHEESECAKE AMBARI';
    const nextSort = Math.max(0, ...INVENTORY_PRODUCTS.filter((p) => p.ambar === ambar).map((p) => p.sort_order)) + 1;
    const product = { id: seq++, name, unit, ambar, is_active: 1, sort_order: nextSort, divisor: 1 };
    INVENTORY_PRODUCTS.push(product);
    return ok(res, product, 201);
  }

  err(res, 405, 'Method not allowed');
};
