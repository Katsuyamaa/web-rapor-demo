'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');
const { WIDGETS } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const id = parseInt(req.query.id, 10);

  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'user', 'guest']);
    if (!user) return;
    const w = WIDGETS.find((x) => x.id === id);
    if (!w) return err(res, 404, 'Widget bulunamadı');
    let cfg = w.config;
    if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch { cfg = {}; } }
    return ok(res, { data: { ...w, config: cfg } });
  }

  if (req.method === 'PUT') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const w = WIDGETS.find((x) => x.id === id);
    if (!w) return err(res, 404, 'Widget bulunamadı');
    const body = await readBody(req);
    const title = (body.title || '').trim();
    if (!title) return err(res, 400, 'Başlık zorunlu');
    w.widget_type = body.widget_type || 'chart';
    w.title = title;
    w.color = body.color || '#2563eb';
    w.config = JSON.stringify(body.config || {});
    return ok(res, { success: true });
  }

  if (req.method === 'DELETE') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const idx = WIDGETS.findIndex((x) => x.id === id);
    if (idx === -1) return err(res, 404, 'Widget bulunamadı');
    WIDGETS.splice(idx, 1);
    return ok(res, { success: true });
  }

  err(res, 405, 'Method not allowed');
};
