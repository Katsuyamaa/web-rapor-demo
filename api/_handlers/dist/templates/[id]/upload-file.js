'use strict';
const { ok, err, requireAuth } = require('../../../../_lib/http');
const { DIST_TEMPLATES } = require('../../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const id = parseInt(req.query.id, 10);
  if (!DIST_TEMPLATES.some((t) => t.id === id)) return err(res, 404, 'Şablon bulunamadı');
  // Demo: no filesystem to persist an uploaded template file to.
  ok(res, { success: true });
};
