'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { TRANSFERS } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  ok(res, [...new Set(TRANSFERS.map((r) => r.cikis_ambari))].sort());
};
