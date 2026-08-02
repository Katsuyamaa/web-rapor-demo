'use strict';
const { err, requireAuth } = require('../_lib/http');
const { filterTransfers } = require('../_lib/fixtures');
const { farkAnalizi } = require('../_lib/analytics');
const { sendXlsx } = require('../_lib/xlsx');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const data = farkAnalizi(filterTransfers(req.query));
  const rows = data.map((d) => ({
    'Tarih': d.dokuman_tarihi, 'Belge No': d.dokuman_no, 'Çıkış Ambarı': d.cikis_ambari,
    'Giriş Ambarı': d.giris_ambari, 'Stok Adı': d.stok_adi, 'Talep': d.talep_edilen_miktar,
    'Gerçekleşen': d.miktar, 'Fark': d.fark, 'Durum': d.durum === 'eksik' ? 'Eksik' : d.durum === 'fazla' ? 'Fazla' : 'Tam',
  }));
  sendXlsx(res, `fark_analizi_${Date.now()}.xlsx`, [{ name: 'Fark Analizi', rows }]);
};
