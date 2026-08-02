'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');
const { PAGES, nextPageId } = require('../_lib/fixtures');

function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const title = (body.title || '').trim();
  if (!title) return err(res, 400, 'Başlık zorunlu');
  const id = nextPageId();
  let slug = slugify(title);
  if (PAGES.some((p) => p.slug === slug)) slug = `${slug}-${Date.now()}`;
  const parent = body.parent_id ? PAGES.find((p) => p.id === body.parent_id) : null;
  const depth = parent ? parent.depth + 1 : 0;
  const path = parent ? `${parent.path}${id}/` : `/${id}/`;
  const newPage = {
    id, title, slug, path, depth, parent_id: body.parent_id || null,
    page_type: body.page_type || 'page', icon: body.icon || null, color: body.color || '#3b82f6',
    sort_order: 0, url: null, created_by: user.id, created_at: new Date().toISOString(),
  };
  PAGES.push(newPage);
  ok(res, { success: true, data: newPage }, 201);
};
