'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { PAGES } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const data = [...PAGES].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.sort_order - b.sort_order));
  ok(res, { data });
};
