'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { TRANSFERS } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  ok(res, { success: true, updated: 0, total: TRANSFERS.length });
};
