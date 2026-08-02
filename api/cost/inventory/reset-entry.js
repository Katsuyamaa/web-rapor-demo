'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { INVENTORY_ENTRIES } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'PATCH') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const entry = INVENTORY_ENTRIES.find((e) => e.id === body.entry_id);
  if (!body.entry_id) return err(res, 400, 'entry_id gerekli');
  if (entry) Object.assign(entry, { uretim: 0, sevkiyat: 0, yemekhane: 0, online: 0, ikram: 0, zayii: 0, diger: 0 });
  ok(res, { ok: true });
};
