'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { PAGES } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'PUT') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  if (!Array.isArray(body)) return err(res, 400, 'Geçersiz veri formatı');
  for (const item of body) {
    const p = PAGES.find((x) => x.id === item.id);
    if (p) p.sort_order = item.sort_order || 0;
  }
  ok(res, { success: true });
};
