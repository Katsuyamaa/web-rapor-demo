'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { TRANSFERS, round } = require('../../_lib/fixtures');
const { buildChartData, buildMultiSeriesData, buildWhere } = require('../../_lib/analytics');

module.exports = async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  if (req.method !== 'POST') return err(res, 405, 'Method not allowed');
  const body = await readBody(req);
  const cfg = body.config || {};
  const widgetType = body.widget_type || 'chart';

  if (widgetType === 'metric') {
    const rows = TRANSFERS.filter(buildWhere(cfg));
    const tv = round(rows.reduce((s, r) => s + r.toplam, 0));
    const dc = new Set(rows.map((r) => r.dokuman_no)).size;
    return ok(res, { chart_data: null, total_value: tv, doc_count: dc });
  }

  const chartType = cfg.chart_type || 'bar';
  const timeGroups = ['gun', 'hafta', 'ay', 'yil'];
  try {
    let chartData;
    if (cfg.series_by && timeGroups.includes(cfg.group_by)) {
      chartData = { ...buildMultiSeriesData(cfg), type: chartType };
    } else {
      chartData = { ...buildChartData(cfg), type: chartType };
    }
    ok(res, { chart_data: chartData });
  } catch (e) {
    err(res, 400, e.message || 'Sorgu hatası');
  }
};
