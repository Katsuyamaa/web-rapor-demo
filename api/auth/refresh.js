'use strict';
const { ok, err, makeToken } = require('../_lib/http');
const { USERS } = require('../_lib/fixtures');

// Demo: always "refreshes" into the default demo admin session (no real refresh-token store).
module.exports = async (req, res) => {
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const user = USERS[1]; // demo/demo
  ok(res, { success: true, access_token: makeToken(user) });
};
