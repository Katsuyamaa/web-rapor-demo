'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { filterTransfers } = require('../_lib/fixtures');
const { farkAnalizi } = require('../_lib/analytics');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const data = farkAnalizi(filterTransfers(req.query));
  ok(res, { data, total: data.length });
};
