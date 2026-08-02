'use strict';
const { ok, err, requireAuth } = require('./_lib/http');
const { TRANSFERS } = require('./_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const cikis = [...new Set(TRANSFERS.map((r) => r.cikis_ambari).filter(Boolean))].sort();
  const giris = [...new Set(TRANSFERS.map((r) => r.giris_ambari).filter(Boolean))].sort();
  const stok = [...new Set(TRANSFERS.map((r) => r.stok_adi).filter(Boolean))].sort();
  ok(res, { cikis_ambari: cikis, giris_ambari: giris, stok_adi: stok });
};
