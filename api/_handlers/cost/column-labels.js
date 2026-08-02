'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { INVENTORY_COLUMN_LABELS } = require('../../_lib/fixtures');

const BASE_COLS = ['uretim', 'sevkiyat', 'yemekhane', 'online', 'ikram', 'zayii', 'diger'];
const EXTRA_COLS = ['extra1', 'extra2', 'extra3', 'extra4', 'extra5'];
const EDITABLE_COLS = [...BASE_COLS, ...EXTRA_COLS];
const DEFAULT_LABELS = {
  uretim: 'Üretim', sevkiyat: 'Sevkiyat', yemekhane: 'Yemekhane', online: 'Online', ikram: 'İkram',
  zayii: 'Zayii', diger: 'Diğer', extra1: 'Ekstra 1', extra2: 'Ekstra 2', extra3: 'Ekstra 3', extra4: 'Ekstra 4', extra5: 'Ekstra 5',
};
function defaultConfig() {
  const cfg = {};
  for (const [k, v] of Object.entries(DEFAULT_LABELS)) cfg[k] = { label: v, visible: !EXTRA_COLS.includes(k) };
  return cfg;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    const ambar = (req.query.ambar || '').trim();
    if (ambar) {
      const cfg = defaultConfig();
      Object.assign(cfg, INVENTORY_COLUMN_LABELS[ambar] || {});
      return ok(res, cfg);
    }
    return ok(res, INVENTORY_COLUMN_LABELS);
  }

  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin']);
    if (!user) return;
    const body = await readBody(req);
    const ambar = (body.ambar || '').trim();
    if (!ambar) return err(res, 400, 'ambar gerekli');
    const labels = body.labels || {};
    if (!INVENTORY_COLUMN_LABELS[ambar]) INVENTORY_COLUMN_LABELS[ambar] = {};
    for (const col of EDITABLE_COLS) {
      const cfg = labels[col] || {};
      let label = String((typeof cfg === 'object' ? cfg.label : cfg) || '').trim().slice(0, 100);
      if (!label) label = DEFAULT_LABELS[col] || col;
      const defaultVisible = !EXTRA_COLS.includes(col);
      const visible = typeof cfg === 'object' && 'visible' in cfg ? !!cfg.visible : defaultVisible;
      INVENTORY_COLUMN_LABELS[ambar][col] = { label, visible };
    }
    return ok(res, { ok: true });
  }

  err(res, 405, 'Method not allowed');
};
