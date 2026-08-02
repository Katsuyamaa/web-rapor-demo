'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { SAVED_FILTERS, nextSavedFilterId } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    const type = req.query.type || 'report';
    if (!['report', 'live_report', 'dashboard'].includes(type)) return err(res, 400, 'Geçersiz filtre tipi.');
    const data = SAVED_FILTERS.filter((f) => f.filter_type === type).slice().reverse();
    return ok(res, { data });
  }
  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const body = await readBody(req);
    const name = (body.name || '').trim();
    if (!name) return err(res, 400, 'Filtre adı gerekli.');
    const filterType = body.filter_type || 'report';
    if (!['report', 'live_report', 'dashboard'].includes(filterType)) return err(res, 400, 'Geçersiz filtre tipi.');
    const id = nextSavedFilterId();
    SAVED_FILTERS.push({
      id, name, cikis_ambari: body.cikis_ambari || '', giris_ambari: body.giris_ambari || '',
      stok_adi: body.stok_adi || '', date_filter: body.date_filter || 'all',
      start_date: body.start_date || null, end_date: body.end_date || null, filter_type: filterType,
    });
    return ok(res, { success: true, id });
  }
  err(res, 405, 'Method not allowed');
};
