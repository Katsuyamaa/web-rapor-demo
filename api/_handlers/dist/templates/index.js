'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { DIST_TEMPLATES, DIST_TEMPLATE_PRODUCTS } = require('../../../_lib/fixtures');

let seq = DIST_TEMPLATES.length + 1;

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;

  if (req.method === 'GET') {
    const data = DIST_TEMPLATES.map((t) => ({ ...t, product_count: (DIST_TEMPLATE_PRODUCTS[t.id] || []).length }));
    return ok(res, { data });
  }

  if (req.method === 'POST') {
    if (user.role !== 'admin') return err(res, 403, 'Yetkiniz yetersiz');
    const body = await readBody(req);
    const name = (body.name || '').trim().toLowerCase().replace(/ /g, '_');
    const displayName = (body.display_name || '').trim();
    const formatType = body.format_type || 'grid';
    if (!name || !displayName) return err(res, 400, 'İsim gerekli');
    if (!['grid', 'vertical'].includes(formatType)) return err(res, 400, 'Geçersiz format');
    const id = seq++;
    DIST_TEMPLATES.push({ id, name, display_name: displayName, format_type: formatType });
    DIST_TEMPLATE_PRODUCTS[id] = [];
    return ok(res, { success: true, id });
  }

  err(res, 405, 'Method not allowed');
};
