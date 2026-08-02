'use strict';
const { ok, err, readBody, requireAuth } = require('../../_lib/http');
const { WIDGETS, TRANSFERS, USERS, PAGES, nextWidgetId, round } = require('../../_lib/fixtures');
const { buildChartData, buildMultiSeriesData } = require('../../_lib/analytics');

function buildWidgetData(w) {
  let cfg = w.config;
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch { cfg = {}; } }
  cfg = cfg || {};
  const entry = {
    id: w.id, page_id: w.page_id, widget_type: w.widget_type, title: w.title,
    system_key: w.system_key, color: w.color || '#3b82f6',
    x: w.pos_x, y: w.pos_y, w: w.size_x, h: w.size_y,
    config: cfg, parent_widget_id: w.parent_widget_id,
    chart_data: null, total_value: 0, doc_count: 0,
  };

  if (w.widget_type === 'system') {
    const skey = w.system_key;
    if (skey === 'total_value') entry.total_value = round(TRANSFERS.reduce((s, r) => s + r.toplam, 0));
    else if (skey === 'total_docs') entry.total_value = new Set(TRANSFERS.map((r) => r.dokuman_no)).size;
    else if (skey === 'total_qty') entry.total_value = round(TRANSFERS.reduce((s, r) => s + r.miktar, 0));
    else if (skey === 'active_users') entry.total_value = USERS.length;
  } else if (w.widget_type === 'chart' || w.widget_type === 'metric') {
    if (w.widget_type === 'chart') {
      try {
        const chartType = cfg.chart_type || w.system_key || 'bar';
        if (chartType !== 'metric') {
          const timeGroups = ['gun', 'hafta', 'ay', 'yil'];
          if (cfg.series_by && timeGroups.includes(cfg.group_by)) {
            entry.chart_data = { ...buildMultiSeriesData(cfg), type: chartType };
          } else {
            entry.chart_data = { ...buildChartData(cfg), type: chartType };
          }
        }
      } catch { entry.chart_data = null; }
    }
    if (!entry.chart_data) {
      const metricType = cfg.metric || 'sum_toplam';
      const rows = TRANSFERS; // metric fallback: whole dataset (matches Flask's simplified fallback path)
      const sum = metricType === 'sum_miktar' ? rows.reduce((s, r) => s + r.miktar, 0)
        : metricType === 'sum_toplam' ? rows.reduce((s, r) => s + r.toplam, 0) : rows.length;
      entry.total_value = round(sum);
      entry.doc_count = new Set(rows.map((r) => r.dokuman_no)).size;
    }
  }
  return entry;
}

module.exports = async (req, res) => {
  const pageId = parseInt(req.query.id, 10);

  if (req.method === 'GET') {
    const user = requireAuth(req, res);
    if (!user) return;
    const rows = WIDGETS.filter((w) => w.page_id === pageId).sort((a, b) => a.pos_y - b.pos_y || a.pos_x - b.pos_x);
    return ok(res, { data: rows.map(buildWidgetData) });
  }

  if (req.method === 'POST') {
    const user = requireAuth(req, res, ['admin', 'user']);
    if (!user) return;
    if (!PAGES.some((p) => p.id === pageId)) return err(res, 404, 'Sayfa bulunamadı');
    const body = await readBody(req);
    const title = (body.title || '').trim();
    if (!title) return err(res, 400, 'Başlık zorunlu');
    const widget = {
      id: nextWidgetId(), page_id: pageId, widget_type: body.widget_type || 'metric', title,
      system_key: body.system_key || null, color: body.color || '#3b82f6',
      pos_x: 0, pos_y: 0, size_x: parseInt(body.size_x || 3, 10), size_y: parseInt(body.size_y || 2, 10),
      config: JSON.stringify(body.config || {}), parent_widget_id: null, created_by: user.id,
    };
    WIDGETS.push(widget);
    return ok(res, { success: true, data: { ...widget, config: JSON.parse(widget.config) } }, 201);
  }

  err(res, 405, 'Method not allowed');
};
