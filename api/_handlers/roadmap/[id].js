'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { ROADMAP_ITEMS } = require('../../_lib/fixtures');

const VALID_CATEGORIES = new Set(['veri_sagligi', 'uyarilar', 'analitik', 'workflow', 'diger']);
const VALID_STATUSES = new Set(['fikir', 'planli', 'gelistirme', 'tamamlandi', 'iptal']);
const VALID_EFFORTS = new Set(['dusuk', 'orta', 'yuksek']);
const ALLOWED = ['title', 'description', 'category', 'status', 'priority', 'effort', 'value_score', 'notes'];

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  const id = parseInt(req.query.id, 10);
  const item = ROADMAP_ITEMS.find((r) => r.id === id);

  if (req.method === 'PATCH') {
    if (!item) return err(res, 404, 'Kayıt bulunamadı.');
    const body = await readBody(req);
    const updates = {};
    for (const k of ALLOWED) if (k in body) updates[k] = body[k];
    if (!Object.keys(updates).length) return err(res, 400, 'Güncellenecek alan yok.');
    if ('category' in updates && !VALID_CATEGORIES.has(updates.category)) return err(res, 400, 'Geçersiz category değeri.');
    if ('status' in updates && !VALID_STATUSES.has(updates.status)) return err(res, 400, 'Geçersiz status değeri.');
    if ('effort' in updates && !VALID_EFFORTS.has(updates.effort)) return err(res, 400, 'Geçersiz effort değeri.');
    if ('value_score' in updates && !VALID_EFFORTS.has(updates.value_score)) return err(res, 400, 'Geçersiz value_score değeri.');
    if ('priority' in updates) {
      updates.priority = parseInt(updates.priority, 10);
      if (![1, 2, 3].includes(updates.priority)) return err(res, 400, 'Öncelik 1-3 arasında olmalı.');
    }
    Object.assign(item, updates, { updated_at: new Date().toISOString() });
    return ok(res, { success: true, item });
  }

  if (req.method === 'DELETE') {
    if (!item) return err(res, 404, 'Kayıt bulunamadı.');
    ROADMAP_ITEMS.splice(ROADMAP_ITEMS.indexOf(item), 1);
    return ok(res, { success: true });
  }

  err(res, 405, 'Method not allowed');
};
