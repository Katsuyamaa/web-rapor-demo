'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { USER_PERMISSIONS } = require('../../_lib/fixtures');

const VALID_PERMISSIONS = new Set(['ciro_karsilastirma', 'filtreler', 'cost', 'gelistirme']);

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  const uid = parseInt(req.query.id, 10);

  if (req.method === 'GET') {
    return ok(res, { permissions: USER_PERMISSIONS[uid] || [] });
  }
  if (req.method === 'PUT') {
    const body = await readBody(req);
    const perms = (body.permissions || []).filter((p) => VALID_PERMISSIONS.has(p));
    return ok(res, { success: true, permissions: perms });
  }
  err(res, 405, 'Method not allowed');
};
