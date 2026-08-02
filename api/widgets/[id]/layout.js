'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { WIDGETS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const id = parseInt(req.query.id, 10);
  const body = await readBody(req);
  const w = WIDGETS.find((x) => x.id === id);
  if (w) { w.pos_x = body.x || 0; w.pos_y = body.y || 0; w.size_x = body.w || 3; w.size_y = body.h || 2; }
  ok(res, { success: true });
};
