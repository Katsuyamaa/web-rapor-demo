'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const password = body.password || '';
  if (password.length < 8 || !/\d/.test(password)) return err(res, 400, 'Şifre en az 8 karakter olmalı ve rakam içermelidir.');
  ok(res, { success: true });
};
