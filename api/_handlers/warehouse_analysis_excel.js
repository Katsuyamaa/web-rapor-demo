'use strict';
const { err, requireAuth } = require('../_lib/http');
const { warehouseAnalysisLogic } = require('../_lib/analytics');
const { sendXlsx } = require('../_lib/xlsx');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const { warehouse = '', start = '', end = '' } = req.query;
  const results = warehouseAnalysisLogic(warehouse, start, end);
  const sheets = results.map((r) => ({
    name: r.warehouse,
    rows: r.data.map((d) => ({
      'Stok Kodu': d.stok_no, 'Stok Adı': d.stok_adi, 'Toplam Miktar': d.toplam_miktar,
      'Ort. Fiyat': d.ortalama_fiyat, 'Toplam Tutar': d.toplam_tutar, 'İşlem Sayısı': d.islem_sayisi,
    })),
  }));
  sendXlsx(res, `ambar_analizi_${Date.now()}.xlsx`, sheets);
};
