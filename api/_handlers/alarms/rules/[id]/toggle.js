'use strict';
const { ok, err, requireAuth } = require('../../../../_lib/http');
const { ALARM_RULES } = require('../../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const id = parseInt(req.query.id, 10);
  const rule = ALARM_RULES.find((r) => r.id === id);
  if (!rule) return err(res, 404, 'Kural bulunamadı');
  rule.is_active = rule.is_active ? 0 : 1;
  ok(res, { success: true, is_active: !!rule.is_active });
};
