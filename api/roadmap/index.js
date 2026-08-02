'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');
const { ROADMAP_ITEMS, nextRoadmapId } = require('../_lib/fixtures');

const VALID_CATEGORIES = new Set(['veri_sagligi', 'uyarilar', 'analitik', 'workflow', 'diger']);
const VALID_STATUSES = new Set(['fikir', 'planli', 'gelistirme', 'tamamlandi', 'iptal']);
const VALID_EFFORTS = new Set(['dusuk', 'orta', 'yuksek']);

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method === 'GET') {
    const { status, category } = req.query;
    let rows = ROADMAP_ITEMS.slice();
    if (status && VALID_STATUSES.has(status)) rows = rows.filter((r) => r.status === status);
    if (category && VALID_CATEGORIES.has(category)) rows = rows.filter((r) => r.category === category);
    rows = rows.slice().sort((a, b) => a.priority - b.priority || (a.created_at < b.created_at ? -1 : 1));
    return ok(res, { data: rows });
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const title = (body.title || '').trim();
    if (!title) return err(res, 400, 'Başlık gerekli.');
    const category = VALID_CATEGORIES.has(body.category) ? body.category : 'diger';
    const status = VALID_STATUSES.has(body.status) ? body.status : 'fikir';
    const effort = VALID_EFFORTS.has(body.effort) ? body.effort : 'orta';
    const value_score = VALID_EFFORTS.has(body.value_score) ? body.value_score : 'orta';
    let priority = parseInt(body.priority ?? 2, 10);
    if (![1, 2, 3].includes(priority)) priority = 2;
    const item = {
      id: nextRoadmapId(), title, description: (body.description || '').trim(), category, status,
      priority, effort, value_score, notes: (body.notes || '').trim(), created_by: user.id,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    ROADMAP_ITEMS.push(item);
    return ok(res, { success: true, item }, 201);
  }

  err(res, 405, 'Method not allowed');
};
