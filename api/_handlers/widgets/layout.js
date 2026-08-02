'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { WIDGETS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const items = await readBody(req);
  for (const item of (Array.isArray(items) ? items : [])) {
    const w = WIDGETS.find((x) => x.id === item.id);
    if (w) {
      w.pos_x = item.x || 0; w.pos_y = item.y || 0; w.size_x = item.w || 3; w.size_y = item.h || 2;
    }
  }
  ok(res, { success: true });
};
