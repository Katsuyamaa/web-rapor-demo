'use strict';
const { ok, requireAuth } = require('../_lib/http');
const { USER_PERMISSIONS } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  ok(res, {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: USER_PERMISSIONS[user.id] || [],
  });
};
