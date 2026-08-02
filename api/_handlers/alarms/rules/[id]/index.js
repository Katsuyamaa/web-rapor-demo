'use strict';
const { ok, err, readBody, requireAuth } = require('../../../../_lib/http');
const { ALARM_RULES } = require('../../../../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  const id = parseInt(req.query.id, 10);
  const rule = ALARM_RULES.find((r) => r.id === id);

  if (req.method === 'PUT') {
    if (!rule) return err(res, 404, 'Kural bulunamadı');
    const body = await readBody(req);
    const name = (body.name || '').trim();
    if (!name) return err(res, 400, 'Kural adı zorunlu');
    Object.assign(rule, {
      name, metric: body.metric || 'total_tutar', ambar: body.ambar || null,
      giris_ambari: body.giris_ambari || null, stok_adi: body.stok_adi || null,
      rule_type: body.rule_type || 'threshold', threshold_value: body.threshold_value ?? null,
      comparison: body.comparison || 'lt', iqr_multiplier: parseFloat(body.iqr_multiplier || 1.5),
      period: body.period || 'gun', is_active: body.is_active === false ? 0 : 1,
    });
    return ok(res, { success: true });
  }

  if (req.method === 'DELETE') {
    if (!rule) return err(res, 404, 'Kural bulunamadı');
    const idx = ALARM_RULES.indexOf(rule);
    ALARM_RULES.splice(idx, 1);
    return ok(res, { success: true });
  }

  err(res, 405, 'Method not allowed');
};
