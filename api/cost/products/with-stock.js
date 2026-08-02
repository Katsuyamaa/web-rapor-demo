'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { INVENTORY_PRODUCTS, INVENTORY_ENTRIES } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const ambar = (req.query.ambar || '').trim();
  const showArchived = req.query.show_archived === 'true';
  let products = INVENTORY_PRODUCTS.filter((p) => showArchived || p.is_active);
  if (ambar) products = products.filter((p) => p.ambar === ambar);

  const result = products.map((p) => {
    const entries = INVENTORY_ENTRIES.filter((e) => e.product_id === p.id).sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
    const last = entries[0];
    const kalan = last ? round3(
      (last.mevcut || 0) + (last.uretim || 0) - (last.sevkiyat || 0) - (last.yemekhane || 0)
      - (last.online || 0) - (last.ikram || 0) - (last.zayii || 0) - (last.diger || 0)
    ) : null;
    return {
      id: p.id, name: p.name, unit: p.unit, ambar: p.ambar, is_active: !!p.is_active, sort_order: p.sort_order,
      divisor: parseFloat(p.divisor || 1),
      entry_id: last ? last.id : null, entry_date: last ? last.entry_date : null,
      mevcut: last ? last.mevcut : null, kalan,
    };
  }).sort((a, b) => (a.ambar || '').localeCompare(b.ambar || '') || a.sort_order - b.sort_order);
  ok(res, result);
};
function round3(v) { return Math.round((v + Number.EPSILON) * 1000) / 1000; }
