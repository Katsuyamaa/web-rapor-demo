'use strict';
const { ok, err, requireAuth } = require('../../../../_lib/http');
const { DIST_TEMPLATES, DIST_TEMPLATE_PRODUCTS } = require('../../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'DELETE') return err(res, 405, 'Method not allowed');
  const id = parseInt(req.query.id, 10);
  const idx = DIST_TEMPLATES.findIndex((t) => t.id === id);
  if (idx !== -1) DIST_TEMPLATES.splice(idx, 1);
  delete DIST_TEMPLATE_PRODUCTS[id];
  ok(res, { success: true });
};
