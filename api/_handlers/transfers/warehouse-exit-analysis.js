'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { filterTransfers, round } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const rows = filterTransfers(req.query);
  const grouped = new Map();
  for (const r of rows) {
    const ambar = r.cikis_ambari || 'Belirtilmemis';
    if (!grouped.has(ambar)) grouped.set(ambar, { ambar, urunler: [], toplam_tutar: 0 });
    const g = grouped.get(ambar);
    g.urunler.push({ stok_adi: r.stok_adi, toplam_miktar: round(r.miktar), toplam_tutar: round(r.toplam), evrak_sayisi: 1, birim: r.temel_birim || '' });
    g.toplam_tutar += r.toplam;
  }
  const data = [...grouped.values()].map((g) => ({ ...g, toplam_tutar: round(g.toplam_tutar) }));
  ok(res, { success: true, data, toplam_ambar: data.length });
};
