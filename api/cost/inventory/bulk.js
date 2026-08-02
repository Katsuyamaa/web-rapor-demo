'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { INVENTORY_ENTRIES } = require('../../_lib/fixtures');

let seq = Math.max(0, ...INVENTORY_ENTRIES.map((e) => e.id)) + 1;
const NUM_FIELDS = ['mevcut', 'uretim', 'sevkiyat', 'yemekhane', 'online', 'ikram', 'zayii', 'diger', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5'];

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const entries = body.entries || [];
  if (!entries.length) return err(res, 400, 'entries boş');

  for (const e of entries) {
    const vals = {};
    for (const f of NUM_FIELDS) vals[f] = e[f] || 0;
    const notes = (e.notes || '').slice(0, 2000);
    if (!e.id) {
      if (e.product_id && e.entry_date) {
        INVENTORY_ENTRIES.push({ id: seq++, entry_date: e.entry_date, product_id: e.product_id, ...vals, notes, fr3002_synced: 0 });
      }
      continue;
    }
    const existing = INVENTORY_ENTRIES.find((x) => x.id === e.id);
    if (existing) Object.assign(existing, vals, { notes });
  }
  ok(res, { ok: true, cascade_days: 0 });
};
