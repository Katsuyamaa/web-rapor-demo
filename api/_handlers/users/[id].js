'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  const uid = parseInt(req.query.id, 10);

  if (req.method === 'DELETE') {
    if (user.id === uid) return err(res, 400, 'Kendinizi silemezsiniz.');
    return ok(res, { success: true });
  }
  if (req.method === 'PUT') {
    const body = await readBody(req);
    const username = (body.username || '').trim();
    const role = body.role || '';
    if (!username) return err(res, 400, 'Kullanıcı adı boş olamaz.');
    if (!['admin', 'user', 'guest'].includes(role)) return err(res, 400, 'Geçersiz rol.');
    if (body.password && (body.password.length < 8 || !/\d/.test(body.password))) {
      return err(res, 400, 'Şifre en az 8 karakter olmalı ve rakam içermelidir.');
    }
    return ok(res, { success: true });
  }
  err(res, 405, 'Method not allowed');
};
