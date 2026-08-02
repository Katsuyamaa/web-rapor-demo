'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'DELETE') return err(res, 405, 'Method not allowed');
  ok(res, { success: true });
};
