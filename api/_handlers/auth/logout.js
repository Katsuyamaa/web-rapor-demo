'use strict';
const { ok, err } = require('../../_lib/http');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  ok(res, { success: true });
};
