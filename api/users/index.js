'use strict';
const { ok, err, readBody, requireAuth } = require('../_lib/http');
const { USERS } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;

  if (req.method === 'GET') {
    return ok(res, { data: USERS.map((u) => ({ id: u.id, username: u.username, role: u.role, password_plain: u.password_plain })) });
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    const username = (body.username || '').trim();
    const password = body.password || '';
    if (!username || !password) return err(res, 400, 'Eksik bilgi.');
    if (password.length < 8 || !/\d/.test(password)) return err(res, 400, 'Şifre en az 8 karakter olmalı ve rakam içermelidir.');
    return ok(res, { success: true });
  }
  err(res, 405, 'Method not allowed');
};
