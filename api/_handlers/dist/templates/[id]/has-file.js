'use strict';
const { ok, err, requireAuth } = require('../../../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  ok(res, { has_file: false });
};
