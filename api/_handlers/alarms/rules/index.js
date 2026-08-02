'use strict';
const { ok, err, readBody, requireAuth } = require('../../../_lib/http');
const { ALARM_RULES } = require('../../../_lib/fixtures');

let seq = ALARM_RULES.length + 1;
const VALID_METRIC = new Set(['total_tutar', 'miktar']);
const VALID_TYPE = new Set(['threshold', 'iqr']);
const VALID_CMP = new Set(['lt', 'gt']);
const VALID_PERIOD = new Set(['gun', 'hafta', 'ay']);

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;

  if (req.method === 'GET') {
    return ok(res, { data: ALARM_RULES.slice().reverse() });
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    const name = (body.name || '').trim();
    if (!name) return err(res, 400, 'Kural adı zorunlu');
    const metric = body.metric || 'total_tutar';
    const ruleType = body.rule_type || 'threshold';
    const comparison = body.comparison || 'lt';
    const period = body.period || 'gun';
    if (!VALID_METRIC.has(metric)) return err(res, 400, 'Geçersiz metrik');
    if (!VALID_TYPE.has(ruleType)) return err(res, 400, 'Geçersiz kural tipi');
    if (!VALID_CMP.has(comparison)) return err(res, 400, 'Geçersiz karşılaştırma');
    if (!VALID_PERIOD.has(period)) return err(res, 400, 'Geçersiz periyot');
    if (ruleType === 'threshold' && body.threshold_value == null) return err(res, 400, 'Eşik değeri zorunlu');
    const id = seq++;
    ALARM_RULES.push({
      id, name, metric, ambar: body.ambar || null, giris_ambari: body.giris_ambari || null,
      stok_adi: body.stok_adi || null, rule_type: ruleType, threshold_value: body.threshold_value ?? null,
      comparison, iqr_multiplier: parseFloat(body.iqr_multiplier || 1.5), period, is_active: 1,
      created_by: user.id, created_at: new Date().toISOString(),
    });
    return ok(res, { success: true, id }, 201);
  }
  err(res, 405, 'Method not allowed');
};
