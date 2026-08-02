'use strict';
const { ok, err, readBody, makeToken } = require('../../_lib/http');
const { USERS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const username = (body.username || '').trim();
  const password = body.password || '';

  if (!username || !password) return err(res, 400, 'Kullanıcı adı ve şifre zorunlu');

  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) return err(res, 401, 'Geçersiz kullanıcı adı veya şifre');

  const access_token = makeToken(user);
  ok(res, {
    token: access_token,
    access_token,
    user: { id: user.id, username: user.username, role: user.role },
  });
};
