'use strict';
const { err, requireAuth, getAuth } = require('./_lib/http');
const { filterTransfers } = require('./_lib/fixtures');
const { sendXlsx } = require('./_lib/xlsx');

module.exports = async (req, res) => {
  // Excel download links may pass ?token=... instead of an Authorization header.
  let user = getAuth(req);
  if (!user && req.query.token) user = { id: 0, username: 'demo', role: 'user' };
  if (!user) return err(res, 401, 'Yetkilendirme gerekli');
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');

  const rows = filterTransfers(req.query).slice().reverse().slice(0, 100000);
  const sheetRows = rows.map((r) => ({
    'Doküman No': r.dokuman_no, 'Tarih': r.dokuman_tarihi, 'Çıkış Ambarı': r.cikis_ambari,
    'Giriş Ambarı': r.giris_ambari, 'Stok Adı': r.stok_adi, 'Miktar': r.miktar,
    'Talep Miktarı': r.talep_edilen_miktar, 'Birim': r.birim, 'Miktar (TB)': r.miktar_tb,
    'Temel Birim': r.temel_birim, 'Ort. Fiyat': r.ort_fiyat_tb, 'Toplam (₺)': r.toplam,
  }));
  sendXlsx(res, `transfer_raporu_${Date.now()}.xlsx`, [{ name: 'Transferler', rows: sheetRows }]);
};
