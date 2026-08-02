'use strict';
const { ok, err, requireAuth } = require('../../_lib/http');
const { ALARM_LOGS } = require('../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'DELETE') return err(res, 405, 'Method not allowed');
  const id = parseInt(req.query.id, 10);
  const idx = ALARM_LOGS.findIndex((l) => l.id === id);
  if (idx === -1) return err(res, 404, 'Log bulunamadı');
  ALARM_LOGS.splice(idx, 1);
  ok(res, { success: true });
};
