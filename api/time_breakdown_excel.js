'use strict';
const { err, requireAuth } = require('./_lib/http');
const { filterTransfers } = require('./_lib/fixtures');
const { timeBreakdown } = require('./_lib/analytics');
const { sendXlsx } = require('./_lib/xlsx');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const groupBy = req.query.group_by || 'gun';
  if (!['gun', 'hafta', 'ay'].includes(groupBy)) return err(res, 400, 'Geçersiz group_by değeri');
  const { start = '', end = '' } = req.query;
  if (!start || !end) return err(res, 400, 'start ve end parametreleri zorunludur');
  const label = { gun: 'Gün', hafta: 'Hafta', ay: 'Ay' }[groupBy];
  const rows = filterTransfers(req.query);
  const data = timeBreakdown(rows, groupBy);
  const sheetRows = data.map((d) => ({
    [label]: d.donem, 'Çıkış Ambarı': d.cikis_ambari, 'Stok Adı': d.stok_adi, 'Miktar': d.miktar, 'Tutar (₺)': d.tutar,
  }));
  sendXlsx(res, `zaman_kirilimi_${groupBy}_${Date.now()}.xlsx`, [{ name: 'Zaman Kırılımı', rows: sheetRows }]);
};
