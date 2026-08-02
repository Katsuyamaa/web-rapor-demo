'use strict';
const { ok, err, requireAuth } = require('../_lib/http');
const { ORDERS, ORDERS_SCHEDULER_CONFIG, round } = require('../_lib/fixtures');

module.exports = async (req, res) => {
  const user = requireAuth(req, res, ['admin', 'user']);
  if (!user) return;
  if (req.method !== 'GET') return err(res, 405, 'Method not allowed');
  const targetDate = req.query.date || '2026-08-03';

  const byBranch = new Map();
  for (const r of ORDERS.filter((o) => o.order_date === targetDate && o.first_seen_at)) {
    if (!byBranch.has(r.branch)) byBranch.set(r.branch, { branch: r.branch, first_seen_at: r.first_seen_at, stoks: new Set(), miktar: 0 });
    const g = byBranch.get(r.branch);
    if (r.first_seen_at < g.first_seen_at) g.first_seen_at = r.first_seen_at;
    g.stoks.add(r.stok_adi); g.miktar += r.miktar;
  }
  const cutoffHour = ORDERS_SCHEDULER_CONFIG.cutoff_hour;
  const cutoffMinute = ORDERS_SCHEDULER_CONFIG.cutoff_minute;
  const cutoffStr = `${String(cutoffHour).padStart(2, '0')}:${String(cutoffMinute).padStart(2, '0')}`;
  let gecCount = 0;
  const siparisVerenler = [...byBranch.values()].sort((a, b) => (a.first_seen_at < b.first_seen_at ? -1 : 1)).map((g) => {
    const timePart = g.first_seen_at.slice(11, 16);
    const gecMi = timePart > cutoffStr;
    if (gecMi) gecCount += 1;
    return { branch: g.branch, first_seen_at: g.first_seen_at.replace(' ', 'T'), urun_sayisi: g.stoks.size, toplam_miktar: round(g.miktar), gec_mi: gecMi };
  });

  const monthAgo = new Date(targetDate); monthAgo.setUTCDate(monthAgo.getUTCDate() - 30);
  const monthAgoStr = monthAgo.toISOString().slice(0, 10);
  const recentBranches = new Set(ORDERS.filter((o) => o.order_date >= monthAgoStr && o.order_date < targetDate).map((o) => o.branch));
  const bekleyenler = [...recentBranches].filter((b) => !byBranch.has(b)).sort();

  ok(res, {
    siparis_verenler: siparisVerenler,
    bekleyenler,
    ozet: { toplam: siparisVerenler.length + bekleyenler.length, veren: siparisVerenler.length, gec: gecCount, bekleyen: bekleyenler.length },
    cutoff: cutoffStr,
    last_fetch: ORDERS_SCHEDULER_CONFIG.last_run,
  });
};
