'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { INVENTORY_ENTRIES } = require('../../_lib/fixtures');

const ALLOWED = new Set(['uretim', 'sevkiyat', 'yemekhane', 'online', 'ikram', 'zayii', 'diger', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5']);

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'PATCH') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const { id, field, value = 0 } = body;
  if (!id || !ALLOWED.has(field)) return err(res, 400, 'geçersiz parametre');
  const entry = INVENTORY_ENTRIES.find((e) => e.id === id);
  if (!entry) return err(res, 404, 'kayıt bulunamadı');
  entry[field] = parseFloat(value) || 0;
  ok(res, { ok: true });
};
