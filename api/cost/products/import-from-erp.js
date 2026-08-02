'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const ambar = (req.query.ambar || '').trim();
  if (!ambar) return err(res, 400, 'ambar gerekli');
  ok(res, { ok: true, imported: 0, skipped: 0 });
};
