'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  if (!body.start || !body.end) return err(res, 400, 'Tarih aralığı gerekli');
  ok(res, { success: true, count: 0 });
};
