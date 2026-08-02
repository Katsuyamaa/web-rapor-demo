'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { TRANSFERS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const byDay = new Map();
  for (const r of TRANSFERS) {
    if (!byDay.has(r.dokuman_tarihi)) byDay.set(r.dokuman_tarihi, { docs: new Set(), rows: 0, ambars: new Set() });
    const g = byDay.get(r.dokuman_tarihi);
    g.docs.add(r.dokuman_no); g.rows += 1; g.ambars.add(r.cikis_ambari);
  }
  const data = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([tarih, g]) => ({
    tarih, evrak_sayisi: g.docs.size, satir_sayisi: g.rows, ambar_sayisi: g.ambars.size,
  }));
  ok(res, { success: true, data, toplam_gun: data.length });
};
