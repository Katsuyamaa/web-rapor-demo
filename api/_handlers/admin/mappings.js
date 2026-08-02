'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method === 'GET') return ok(res, { success: true, data: { ambar: {}, stok: {} } });
  if (req.method === 'POST') {
    const body = await readBody(req);
    if (typeof body.ambar !== 'object' || typeof body.stok !== 'object') return err(res, 400, 'Geçersiz format.');
    return ok(res, { success: true });
  }
  err(res, 405, 'Method not allowed');
};
