'use strict';
const { ok, err, requireAuth } = require('./_lib/http');
const { filterTransfers } = require('./_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const rows = filterTransfers(req.query).slice().reverse();
  const data = rows.map((r) => ({
    id: String(r.id), dokuman_no: r.dokuman_no, dokuman_tarihi: r.dokuman_tarihi,
    cikis_ambari: r.cikis_ambari, giris_ambari: r.giris_ambari, stok_no: r.stok_no,
    stok_adi: r.stok_adi, miktar: String(r.miktar), talep_edilen_miktar: String(r.talep_edilen_miktar),
    birim: r.birim, miktar_tb: String(r.miktar_tb), temel_birim: r.temel_birim,
    ort_fiyat_tb: String(r.ort_fiyat_tb), toplam: String(r.toplam), source_file: r.source_file,
  }));
  ok(res, { data });
};
