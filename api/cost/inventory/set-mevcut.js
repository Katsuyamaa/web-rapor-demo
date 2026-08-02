'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { INVENTORY_ENTRIES } = require('../../_lib/fixtures');

let seq = Math.max(0, ...INVENTORY_ENTRIES.map((e) => e.id)) + 1;

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'PATCH') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const { product_id, date: dateStr = '2026-08-02', mevcut } = body;
  if (product_id == null || mevcut == null) return err(res, 400, 'product_id ve mevcut zorunlu');
  const existing = INVENTORY_ENTRIES.find((e) => e.entry_date === dateStr && e.product_id === product_id);
  if (existing) existing.mevcut = parseFloat(mevcut);
  else INVENTORY_ENTRIES.push({ id: seq++, entry_date: dateStr, product_id, mevcut: parseFloat(mevcut), uretim: 0, sevkiyat: 0, yemekhane: 0, online: 0, ikram: 0, zayii: 0, diger: 0, extra1: 0, extra2: 0, extra3: 0, extra4: 0, extra5: 0, notes: null, fr3002_synced: 0 });
  ok(res, { ok: true });
};
