'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');

// In-memory bonus endpoint (not exercised by the current frontend, kept for API-contract completeness).
const DASHBOARD_FILTERS = [];
let seq = 1;

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method === 'GET') return ok(res, { data: DASHBOARD_FILTERS });
  if (req.method === 'POST') {
    const body = await readBody(req);
    const name = (body.name || '').trim();
    if (!name) return err(res, 400, 'Filtre adı gerekli.');
    const id = seq++;
    DASHBOARD_FILTERS.push({
      id, name, cikis_ambari: body.cikis_ambari || '', giris_ambari: body.giris_ambari || '',
      stok_adi: body.stok_adi || '', date_filter: body.date_filter || 'all',
      start_date: body.start_date || null, end_date: body.end_date || null,
    });
    return ok(res, { success: true, id });
  }
  err(res, 405, 'Method not allowed');
};
