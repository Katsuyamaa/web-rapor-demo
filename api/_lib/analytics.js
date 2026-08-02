'use strict';
/** In-memory equivalents of the Flask analytics query logic (core/dynamic_sql.py, routes/transfers.py). */
const { TRANSFERS, splitCsv, round } = require('./fixtures');

function warehouseAnalysisLogic(warehouseParam, start, end, girisParam = '', stokParam = '') {
  const warehouses = splitCsv(warehouseParam);
  const girisVals = splitCsv(girisParam);
  const stokVals = splitCsv(stokParam);
  let effStart = start, effEnd = end;
  if (!start && !end) {
    const monthAgo = new Date('2026-08-02'); monthAgo.setUTCDate(monthAgo.getUTCDate() - 30);
    effStart = monthAgo.toISOString().slice(0, 10);
  }
  const queryList = warehouses.length ? warehouses : [null];
  return queryList.map((wh) => {
    const rows = TRANSFERS.filter((r) => {
      if (wh && r.cikis_ambari !== wh) return false;
      if (effStart && r.dokuman_tarihi < effStart) return false;
      if (effEnd && r.dokuman_tarihi > effEnd) return false;
      if (girisVals.length && !girisVals.includes(r.giris_ambari)) return false;
      if (stokVals.length && !stokVals.includes(r.stok_adi)) return false;
      return true;
    });
    const byStok = new Map();
    for (const r of rows) {
      const key = r.stok_adi + '||' + r.stok_no;
      if (!byStok.has(key)) byStok.set(key, { stok_adi: r.stok_adi, stok_no: r.stok_no, miktarSum: 0, priceSum: 0, priceN: 0, tutarSum: 0, docs: new Set() });
      const g = byStok.get(key);
      g.miktarSum += r.miktar; g.priceSum += r.ort_fiyat_tb; g.priceN += 1;
      g.tutarSum += r.toplam; g.docs.add(r.dokuman_no);
    }
    const data = [...byStok.values()].map((g) => ({
      stok_adi: g.stok_adi, stok_no: g.stok_no,
      toplam_miktar: round(g.miktarSum), ortalama_fiyat: round(g.priceSum / g.priceN),
      toplam_tutar: round(g.tutarSum), islem_sayisi: g.docs.size,
    })).sort((a, b) => b.toplam_tutar - a.toplam_tutar);

    const urunCesidi = byStok.size;
    const toplamMiktar = round(rows.reduce((s, r) => s + r.miktar, 0));
    const toplamTutar = round(rows.reduce((s, r) => s + r.toplam, 0));
    const toplamIslem = new Set(rows.map((r) => r.dokuman_no)).size;

    return {
      warehouse: wh || 'Tüm Ambarlar',
      summary: { urun_cesidi: urunCesidi, toplam_miktar: toplamMiktar, toplam_tutar: toplamTutar, toplam_islem: toplamIslem },
      data,
    };
  });
}

function timeBreakdown(rows, groupBy) {
  const keyFn = {
    gun: (r) => r.dokuman_tarihi,
    hafta: (r) => isoWeekKey(r.dokuman_tarihi),
    ay: (r) => r.dokuman_tarihi.slice(0, 7),
  }[groupBy];
  const groups = new Map();
  for (const r of rows) {
    const donem = keyFn(r);
    const key = donem + '||' + r.cikis_ambari + '||' + r.stok_adi;
    if (!groups.has(key)) groups.set(key, { donem, cikis_ambari: r.cikis_ambari || '', stok_adi: r.stok_adi || '', miktar: 0, tutar: 0 });
    const g = groups.get(key);
    g.miktar += r.miktar; g.tutar += r.toplam;
  }
  const data = [...groups.values()].map((g) => ({ ...g, miktar: round(g.miktar), tutar: round(g.tutar) }));
  data.sort((a, b) => (a.donem < b.donem ? -1 : a.donem > b.donem ? 1 : b.tutar - a.tutar));
  return data;
}

function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}${String(week).padStart(2, '0')}`;
}

function comparison(start1, end1, start2, end2, cikis, giris, stok) {
  const cikisVals = splitCsv(cikis), girisVals = splitCsv(giris), stokVals = splitCsv(stok);
  const inRange = (r, s, e) => r.dokuman_tarihi >= s && r.dokuman_tarihi <= e;
  const extraOk = (r) => (!cikisVals.length || cikisVals.includes(r.cikis_ambari))
    && (!girisVals.length || girisVals.includes(r.giris_ambari))
    && (!stokVals.length || stokVals.includes(r.stok_adi));

  function fetchPeriod(s, e) {
    const rows = TRANSFERS.filter((r) => inRange(r, s, e) && extraOk(r));
    const groups = new Map();
    for (const r of rows) {
      const key = (r.cikis_ambari || '') + '||' + (r.stok_adi || '');
      if (!groups.has(key)) groups.set(key, { cikis_ambari: r.cikis_ambari, stok_adi: r.stok_adi, miktar: 0, tutar: 0, docs: new Set() });
      const g = groups.get(key);
      g.miktar += r.miktar; g.tutar += r.toplam; g.docs.add(r.dokuman_no);
    }
    const summary = rows.reduce((acc, r) => {
      acc.miktar += r.miktar; acc.tutar += r.toplam; acc.docs.add(r.dokuman_no); return acc;
    }, { miktar: 0, tutar: 0, docs: new Set() });
    return { groups, summary: { miktar: summary.miktar, tutar: summary.tutar, islem: summary.docs.size } };
  }

  const d1 = fetchPeriod(start1, end1);
  const d2 = fetchPeriod(start2, end2);
  const merged = [];
  const seen = new Set();
  for (const [key, g] of d1.groups) {
    seen.add(key);
    const d2g = d2.groups.get(key);
    merged.push({
      cikis_ambari: g.cikis_ambari || 'Belirtilmemiş', stok_adi: g.stok_adi || '—',
      d1_miktar: round(g.miktar), d1_tutar: round(g.tutar),
      d2_miktar: round(d2g ? d2g.miktar : 0), d2_tutar: round(d2g ? d2g.tutar : 0),
    });
  }
  for (const [key, g] of d2.groups) {
    if (seen.has(key)) continue;
    merged.push({
      cikis_ambari: g.cikis_ambari || 'Belirtilmemiş', stok_adi: g.stok_adi || '—',
      d1_miktar: 0, d1_tutar: 0, d2_miktar: round(g.miktar), d2_tutar: round(g.tutar),
    });
  }
  return {
    summary: {
      d1: { miktar: round(d1.summary.miktar), tutar: round(d1.summary.tutar), islem: d1.summary.islem },
      d2: { miktar: round(d2.summary.miktar), tutar: round(d2.summary.tutar), islem: d2.summary.islem },
    },
    rows: merged,
  };
}

function abcAnalysis(rows) {
  const byStok = new Map();
  for (const r of rows) {
    if (!r.stok_adi || !r.stok_adi.trim()) continue;
    byStok.set(r.stok_adi, (byStok.get(r.stok_adi) || 0) + r.toplam);
  }
  const list = [...byStok.entries()].map(([stok_adi, toplam_tutar]) => ({ stok_adi, toplam_tutar }))
    .sort((a, b) => b.toplam_tutar - a.toplam_tutar || a.stok_adi.localeCompare(b.stok_adi));
  const genelToplam = list.reduce((s, r) => s + r.toplam_tutar, 0);
  if (!list.length || genelToplam <= 0) return { rows: [], ozet: {} };
  let kumulatif = 0;
  const ozet = { A: { urun_sayisi: 0, ciro_yuzde: 0 }, B: { urun_sayisi: 0, ciro_yuzde: 0 }, C: { urun_sayisi: 0, ciro_yuzde: 0 } };
  const result = list.map((r) => {
    const yuzde = (r.toplam_tutar / genelToplam) * 100;
    kumulatif += yuzde;
    const segment = kumulatif <= 80 ? 'A' : kumulatif <= 95 ? 'B' : 'C';
    ozet[segment].urun_sayisi += 1; ozet[segment].ciro_yuzde += yuzde;
    return { stok_adi: r.stok_adi, toplam_tutar: round(r.toplam_tutar), yuzde: round(yuzde), kumulatif_yuzde: round(kumulatif), segment };
  });
  for (const s of Object.keys(ozet)) ozet[s].ciro_yuzde = round(ozet[s].ciro_yuzde, 1);
  return { rows: result, ozet };
}

function sapmaRaporu(rows) {
  const withTalep = rows.filter((r) => r.talep_edilen_miktar > 0);
  function agg(keyFn) {
    const map = new Map();
    for (const r of withTalep) {
      const key = keyFn(r);
      if (!map.has(key)) map.set(key, { key, talep: 0, gerceklesen: 0 });
      const g = map.get(key); g.talep += r.talep_edilen_miktar; g.gerceklesen += r.miktar;
    }
    return [...map.values()].map((g) => {
      const fark = g.gerceklesen - g.talep;
      const farkYuzde = g.talep > 0 ? (fark / g.talep) * 100 : 0;
      return { key: g.key, talep: round(g.talep), gerceklesen: round(g.gerceklesen), fark: round(fark), fark_yuzde: round(farkYuzde, 1) };
    }).sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark));
  }
  const urun = agg((r) => r.stok_adi).map((x) => ({ stok_adi: x.key, talep: x.talep, gerceklesen: x.gerceklesen, fark: x.fark, fark_yuzde: x.fark_yuzde }));
  const ambar = agg((r) => r.cikis_ambari).map((x) => ({ cikis_ambari: x.key, talep: x.talep, gerceklesen: x.gerceklesen, fark: x.fark, fark_yuzde: x.fark_yuzde }))
    .sort((a, b) => (a.cikis_ambari || '').localeCompare(b.cikis_ambari || ''));
  return { urun_sapmalari: urun, ambar_ozeti: ambar };
}

const AMBAR_AKIS_DIMS = {
  cikis_ambari: (r) => r.cikis_ambari,
  giris_ambari: (r) => r.giris_ambari,
  tarih_gun: (r) => r.dokuman_tarihi,
  tarih_ay: (r) => r.dokuman_tarihi.slice(0, 7),
};

function ambarAkis(rowBy, colBy, rows) {
  const rowFn = AMBAR_AKIS_DIMS[rowBy];
  const colFn = AMBAR_AKIS_DIMS[colBy];
  const isTarihRow = rowBy.startsWith('tarih');
  const matris = {};
  const satirlarSet = [];
  const sutunlarSet = [];
  let maxTutar = 0;
  for (const r of rows) {
    const rowVal = rowFn(r) != null ? String(rowFn(r)) : '';
    const colVal = colFn(r) != null ? String(colFn(r)) : '';
    if (!rowVal || !colVal) continue;
    if (!satirlarSet.includes(rowVal)) satirlarSet.push(rowVal);
    if (!sutunlarSet.includes(colVal)) sutunlarSet.push(colVal);
    if (!matris[rowVal]) matris[rowVal] = {};
    if (!matris[rowVal][colVal]) matris[rowVal][colVal] = { tutar: 0, miktar: 0, evrak: new Set() };
    matris[rowVal][colVal].tutar += r.toplam;
    matris[rowVal][colVal].miktar += r.miktar;
    matris[rowVal][colVal].evrak.add(r.dokuman_no);
    if (matris[rowVal][colVal].tutar > maxTutar) maxTutar = matris[rowVal][colVal].tutar;
  }
  const out = {};
  for (const row of Object.keys(matris)) {
    out[row] = {};
    for (const col of Object.keys(matris[row])) {
      const c = matris[row][col];
      out[row][col] = { tutar: round(c.tutar), miktar: round(c.miktar), evrak_sayisi: c.evrak.size };
    }
  }
  if (isTarihRow) satirlarSet.sort();
  else satirlarSet.sort((a, b) => {
    const sa = Object.values(out[a] || {}).reduce((s, v) => s + v.tutar, 0);
    const sb = Object.values(out[b] || {}).reduce((s, v) => s + v.tutar, 0);
    return sb - sa;
  });
  return { satirlar: satirlarSet, sutunlar: sutunlarSet, matris: out, max_tutar: round(maxTutar) };
}

function farkAnalizi(rows) {
  return rows.filter((r) => r.talep_edilen_miktar > 0).map((r) => {
    const fark = r.miktar - r.talep_edilen_miktar;
    const durum = r.miktar < r.talep_edilen_miktar ? 'eksik' : r.miktar > r.talep_edilen_miktar ? 'fazla' : 'tam';
    return {
      dokuman_no: r.dokuman_no, dokuman_tarihi: r.dokuman_tarihi, cikis_ambari: r.cikis_ambari,
      giris_ambari: r.giris_ambari, stok_adi: r.stok_adi, talep_edilen_miktar: round(r.talep_edilen_miktar),
      miktar: round(r.miktar), fark: round(fark), durum,
    };
  }).sort((a, b) => (a.dokuman_tarihi < b.dokuman_tarihi ? 1 : a.dokuman_tarihi > b.dokuman_tarihi ? -1 : 0));
}

function ciroKarsilastirma(granularity, ambarlarRaw, startRaw, endRaw) {
  const ambarlar = splitCsv(ambarlarRaw);
  const thisEnd = endRaw || '2026-08-02';
  const thisStart = startRaw || `${thisEnd.slice(0, 4)}-01-01`;
  const shiftYear = (d, delta) => {
    const dt = new Date(d + 'T00:00:00Z'); dt.setUTCFullYear(dt.getUTCFullYear() + delta);
    return dt.toISOString().slice(0, 10);
  };
  const lastStart = shiftYear(thisStart, -1);
  const lastEnd = shiftYear(thisEnd, -1);
  const inWindow = (r) => r.dokuman_tarihi >= lastStart && r.dokuman_tarihi <= thisEnd
    && (!ambarlar.length || ambarlar.includes(r.cikis_ambari));
  const rows = TRANSFERS.filter(inWindow);

  const labelFn = {
    gun: (r) => r.dokuman_tarihi.slice(5),
    hafta: (r) => String(getIsoWeek(r.dokuman_tarihi)),
    ay: (r) => String(Number(r.dokuman_tarihi.slice(5, 7))),
  }[granularity] || ((r) => String(Number(r.dokuman_tarihi.slice(5, 7))));

  const chartMap = new Map();
  let totalThis = 0, totalLast = 0;
  const whMap = new Map();
  for (const r of rows) {
    const isThis = r.dokuman_tarihi >= thisStart && r.dokuman_tarihi <= thisEnd;
    const isLast = r.dokuman_tarihi >= lastStart && r.dokuman_tarihi <= lastEnd;
    if (isThis) totalThis += r.toplam;
    if (isLast) totalLast += r.toplam;
    if (isThis || isLast) {
      const label = labelFn(r);
      if (!chartMap.has(label)) chartMap.set(label, { label, this_year: 0, last_year: 0 });
      const g = chartMap.get(label);
      if (isThis) g.this_year += r.toplam;
      if (isLast) g.last_year += r.toplam;

      const wh = r.cikis_ambari;
      if (!whMap.has(wh)) whMap.set(wh, { ambar: wh, this_year: 0, last_year: 0 });
      const wg = whMap.get(wh);
      if (isThis) wg.this_year += r.toplam;
      if (isLast) wg.last_year += r.toplam;
    }
  }
  const chart = [...chartMap.values()].filter((g) => g.this_year > 0)
    .map((g) => ({ label: g.label, this_year: round(g.this_year), last_year: round(g.last_year) }));
  const warehouses = [...whMap.values()].filter((g) => g.this_year > 0 || g.last_year > 0)
    .map((g) => ({ ambar: g.ambar, this_year: round(g.this_year), last_year: round(g.last_year) }))
    .sort((a, b) => b.this_year - a.this_year);

  return {
    summary: { this_year: { total: round(totalThis) }, last_year: { total: round(totalLast) } },
    chart, warehouses,
    meta: { this_year_range: [thisStart, thisEnd], last_year_range: [lastStart, lastEnd], granularity },
  };
}
function getIsoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

// ── DynamicChartBuilder equivalent (widgets) ─────────────────────────────────
const ALLOWED_METRICS = {
  sum_miktar: (r) => r.miktar, sum_toplam: (r) => r.toplam,
  count_id: () => 1, count_docs: (r) => r.dokuman_no,
};
const ALLOWED_GROUP_BY = {
  gun: (r) => r.dokuman_tarihi,
  hafta: (r) => isoWeekKey(r.dokuman_tarihi),
  ay: (r) => r.dokuman_tarihi.slice(0, 7),
  yil: (r) => r.dokuman_tarihi.slice(0, 4),
  cikis_ambari: (r) => r.cikis_ambari,
  giris_ambari: (r) => r.giris_ambari,
  stok_adi: (r) => r.stok_adi,
};
const TIME_GROUPS = new Set(['gun', 'hafta', 'ay', 'yil']);

function buildWhere(config = {}) {
  return (r) => {
    for (const field of ['cikis_ambari', 'giris_ambari', 'stok_adi']) {
      let vals = config[field];
      if (typeof vals === 'string') vals = splitCsv(vals);
      if (vals && vals.length && !vals.includes(r[field])) return false;
    }
    const dateFilter = config.date_filter || 'all';
    const today = '2026-08-02';
    const daysAgo = (n) => { const d = new Date(today); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
    if (dateFilter === 'today' && r.dokuman_tarihi !== today) return false;
    if (dateFilter === 'yesterday' && r.dokuman_tarihi !== daysAgo(1)) return false;
    if (dateFilter === 'last7days' && (r.dokuman_tarihi < daysAgo(7) || r.dokuman_tarihi > today)) return false;
    if (dateFilter === 'last30days' && (r.dokuman_tarihi < daysAgo(30) || r.dokuman_tarihi > today)) return false;
    if (dateFilter === 'thisMonth' && r.dokuman_tarihi.slice(0, 7) !== today.slice(0, 7)) return false;
    if (dateFilter === 'custom') {
      if (config.start_date && r.dokuman_tarihi < config.start_date) return false;
      if (config.end_date && r.dokuman_tarihi > config.end_date) return false;
    }
    return true;
  };
}

function aggregate(rows, groupFn, metricFn, isCountDocs) {
  const map = new Map();
  const docSets = isCountDocs ? new Map() : null;
  for (const r of rows) {
    const key = groupFn(r);
    if (isCountDocs) {
      if (!docSets.has(key)) docSets.set(key, new Set());
      docSets.get(key).add(metricFn(r));
    } else {
      map.set(key, (map.get(key) || 0) + metricFn(r));
    }
  }
  if (isCountDocs) {
    for (const [k, set] of docSets) map.set(k, set.size);
  }
  return map;
}

function buildChartData(config = {}) {
  const metricKey = config.metric || 'sum_toplam';
  const groupByKey = config.group_by || 'stok_adi';
  const limit = parseInt(config.data_limit || 10, 10);
  const groupFn = ALLOWED_GROUP_BY[groupByKey] || ALLOWED_GROUP_BY.stok_adi;
  const metricFn = ALLOWED_METRICS[metricKey] || ALLOWED_METRICS.sum_toplam;
  const isCountDocs = metricKey === 'count_docs';
  const rows = TRANSFERS.filter(buildWhere(config));
  const map = aggregate(rows, groupFn, metricFn, isCountDocs);
  let entries = [...map.entries()].map(([lbl, val]) => ({ lbl: String(lbl), val }));
  if (TIME_GROUPS.has(groupByKey)) {
    entries.sort((a, b) => (a.lbl < b.lbl ? -1 : a.lbl > b.lbl ? 1 : 0));
  } else {
    entries.sort((a, b) => b.val - a.val);
    entries = entries.slice(0, limit);
  }
  return { labels: entries.map((e) => e.lbl), values: entries.map((e) => round(e.val)) };
}

function buildMultiSeriesData(config = {}) {
  const metricKey = config.metric || 'sum_toplam';
  const groupByKey = config.group_by || 'ay';
  const seriesKey = config.series_by;
  if (!ALLOWED_GROUP_BY[seriesKey] || !ALLOWED_GROUP_BY[groupByKey]) throw new Error('invalid series_by/group_by');
  const groupFn = ALLOWED_GROUP_BY[groupByKey];
  const seriesFn = ALLOWED_GROUP_BY[seriesKey];
  const metricFn = ALLOWED_METRICS[metricKey] || ALLOWED_METRICS.sum_toplam;
  const isCountDocs = metricKey === 'count_docs';
  const rows = TRANSFERS.filter(buildWhere(config));

  const seriesTotals = new Map();
  const lookup = new Map();
  const docSets = new Map();
  const labelsOrder = [];
  for (const r of rows) {
    const lbl = String(groupFn(r));
    const ser = String(seriesFn(r));
    if (!labelsOrder.includes(lbl)) labelsOrder.push(lbl);
    const key = lbl + '||' + ser;
    if (isCountDocs) {
      if (!docSets.has(key)) docSets.set(key, new Set());
      docSets.get(key).add(metricFn(r));
    } else {
      lookup.set(key, (lookup.get(key) || 0) + metricFn(r));
    }
  }
  if (isCountDocs) for (const [k, set] of docSets) lookup.set(k, set.size);
  for (const [key, val] of lookup) {
    const ser = key.split('||')[1];
    seriesTotals.set(ser, (seriesTotals.get(ser) || 0) + val);
  }
  const maxSeries = parseInt(config.data_limit || 10, 10);
  const topSeries = [...seriesTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxSeries).map(([name]) => name);
  labelsOrder.sort();
  return {
    labels: labelsOrder,
    series: topSeries.map((name) => ({
      name, data: labelsOrder.map((lbl) => round(lookup.get(lbl + '||' + name) || 0)),
    })),
  };
}

module.exports = {
  warehouseAnalysisLogic, timeBreakdown, comparison, abcAnalysis, sapmaRaporu,
  ambarAkis, AMBAR_AKIS_DIMS, farkAnalizi, ciroKarsilastirma,
  buildWhere, buildChartData, buildMultiSeriesData, TIME_GROUPS, ALLOWED_METRICS,
};
