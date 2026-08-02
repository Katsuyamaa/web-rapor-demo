'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');
const { PAGES } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const param = req.query.slug;

  if (req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    const page = PAGES.find((p) => p.slug === param);
    if (!page) return err(res, 404, 'Sayfa bulunamadı');
    return ok(res, { data: page });
  }

  if (req.method === 'PUT') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const id = parseInt(param, 10);
    const page = PAGES.find((p) => p.id === id);
    if (!page) return err(res, 404, 'Sayfa bulunamadı');
    const body = await readBody(req);
    if (body.title !== undefined) {
      if (!body.title.trim()) return err(res, 400, 'Başlık boş olamaz');
      page.title = body.title.trim();
    }
    if (body.icon !== undefined) page.icon = body.icon;
    if ('sort_order' in body) page.sort_order = body.sort_order;
    if ('parent_id' in body) {
      if (body.parent_id === id) return err(res, 400, 'Sayfa kendi kendisinin üstü olamaz');
      const parent = body.parent_id ? PAGES.find((p) => p.id === body.parent_id) : null;
      page.parent_id = body.parent_id || null;
      page.depth = parent ? parent.depth + 1 : 0;
      page.path = parent ? `${parent.path}${id}/` : `/${id}/`;
    }
    return ok(res, { success: true, data: page });
  }

  if (req.method === 'DELETE') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const id = parseInt(param, 10);
    const idx = PAGES.findIndex((p) => p.id === id);
    if (idx === -1) return err(res, 404, 'Sayfa bulunamadı');
    if (PAGES[idx].path === '/') return err(res, 400, 'Anasayfa silinemez');
    PAGES.splice(idx, 1);
    return ok(res, { success: true });
  }

  err(res, 405, 'Method not allowed');
};
