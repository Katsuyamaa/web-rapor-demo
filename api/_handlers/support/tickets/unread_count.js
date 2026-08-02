'use strict';
const { ok, err, requireAuth } = require('../../../_lib/http');
const { SUPPORT_TICKETS } = require('../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user', 'guest']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const isAdmin = user.role === 'admin';
  const count = isAdmin
    ? SUPPORT_TICKETS.filter((t) => t.status === 'yeni').length
    : 0; // demo: no per-user unread comment tracking
  ok(res, { count });
};
