// Shared report UI components
import React, { useContext, useState, useRef } from 'react'
import { DarkModeContext } from '../../App'
import Chart from 'react-apexcharts'
import * as XLSX from 'xlsx'

// ─── Icon ────────────────────────────────────────────────────────────────────
export function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.75 }) {
  const paths = {
    calendar:      <><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    filter:        <path d="M4 5h16l-6 8v6l-4-2v-4z" />,
    download:      <><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></>,
    search:        <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
    arrow_up:      <path d="M7 14l5-5 5 5" />,
    arrow_down:    <path d="M7 10l5 5 5-5" />,
    save:          <><path d="M5 3h11l3 3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>,
    print:         <><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>,
    refresh:       <><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></>,
    x:             <path d="M6 6l12 12M6 18L18 6" />,
    check:         <path d="M4 12l5 5L20 6" />,
    warehouse:     <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    chart_line:    <><path d="M3 3v18h18" /><path d="M7 14l3-3 3 3 5-5" /></>,
    sparkle:       <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {paths[name] || null}
    </svg>
  )
}

// ─── Format helpers ───────────────────────────────────────────────────────────
export function fmt(n) {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('tr-TR')
}

export function fmtTL(n) {
  if (n == null || isNaN(n)) return '—'
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `₺${(n / 1_000).toFixed(1)}K`
  return `₺${Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`
}

// ─── Period helper ────────────────────────────────────────────────────────────
export function periodToDates(period) {
  const today = new Date()
  const pad = n => String(n).padStart(2, '0')
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const todayStr = fmt(today)

  if (period === 'bugun') {
    return { start: todayStr, end: todayStr }
  }
  if (period === 'dun') {
    const d = new Date(today); d.setDate(d.getDate() - 1)
    const dunStr = fmt(d)
    return { start: dunStr, end: dunStr }
  }
  if (period === 'hafta') {
    const mon = new Date(today)
    mon.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
    return { start: fmt(mon), end: todayStr }
  }
  if (period === 'gecenHafta') {
    const d = new Date(today)
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1) - 7) // Last week's Monday
    const end = new Date(d)
    end.setDate(end.getDate() + 6) // Last week's Sunday
    return { start: fmt(d), end: fmt(end) }
  }
  if (period === 'ay') {
    return { start: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`, end: todayStr }
  }
  if (period === 'gecenAy') {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const end = new Date(today.getFullYear(), today.getMonth(), 0) // Last day of last month
    return { start: fmt(d), end: fmt(end) }
  }
  if (period === 'yil') {
    return { start: `${today.getFullYear()}-01-01`, end: todayStr }
  }
  if (period === 'son30') {
    const d = new Date(today); d.setDate(d.getDate() - 30)
    return { start: fmt(d), end: todayStr }
  }
  return { start: '', end: '' }
}

// ─── Sparkline ────────────────────────────────────────────────────────────────
export function Sparkline({ data, color = 'currentColor', fill = false, height = 40, width = 100 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2])
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const area = `${d} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <path d={area} fill={color} opacity="0.15" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, sub, series, accentColor = 'var(--primary)' }) {
  return (
    <div className="kpi-card" style={series && series.length > 1 ? undefined : { paddingBottom: 16 }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value-wrap">
        <div className="kpi-value-inner">
          <div className="kpi-value">{value}</div>
          {sub && <div className="kpi-sub">{sub}</div>}
        </div>
        {series && series.length > 1 && (
          <div className="kpi-sparkline">
            <Sparkline data={series} color={accentColor} fill height={44} width={90} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bar List ─────────────────────────────────────────────────────────────────
export function BarList({ items, valueFormat = v => v, accentColor = 'var(--primary, #2563eb)' }) {
  const max = Math.max(...items.map(i => i.value || 0)) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{it.label}</div>
            <div style={{ position: 'relative', height: 5, background: 'var(--bg-main)', borderRadius: 3 }}>
              <div style={{ position: 'absolute', inset: 0, width: `${(it.value / max) * 100}%`, background: accentColor, borderRadius: 3, opacity: 0.75 }} />
            </div>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', minWidth: 72, textAlign: 'right' }}>{valueFormat(it.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Period Tabs ──────────────────────────────────────────────────────────────
export function PeriodTabs({ value, onChange, options }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
      <div style={{ display: 'inline-flex', background: 'var(--bg-main)', borderRadius: 8, padding: 3, gap: 2 }}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: '5px 14px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
            background: value === o.value ? 'var(--bg-surface)' : 'transparent',
            color: value === o.value ? 'var(--text-primary)' : 'var(--text-tertiary)',
            border: 'none', borderRadius: 6, cursor: 'pointer',
            boxShadow: value === o.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

// ─── Transfer Table (paginated) ───────────────────────────────────────────────
const PAGE_SIZE = 100

export function TransferTable({ data, loading }) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const slice = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset to page 0 when data changes
  const [prevLen, setPrevLen] = useState(data.length)
  if (data.length !== prevLen) { setPage(0); setPrevLen(data.length) }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)' }}>
              {['Doküman No', 'Tarih', 'Çıkış Ambarı', 'Giriş Ambarı', 'Stok Adı', 'Miktar', 'Toplam'].map((h, i) => (
                <th key={h} style={{
                  padding: '9px 14px', textAlign: i >= 5 ? 'right' : 'left',
                  fontWeight: 700, color: 'var(--text-tertiary)',
                  textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.04em',
                  borderBottom: '1px solid var(--border-medium)', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                {loading ? 'Yükleniyor…' : 'Veri bulunamadı.'}
              </td></tr>
            ) : slice.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                <td style={{ padding: '9px 14px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5, color: 'var(--text-secondary)' }}>{r.dokuman_no}</td>
                <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.dokuman_tarihi}</td>
                <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{r.cikis_ambari}</td>
                <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{r.giris_ambari}</td>
                <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.stok_adi}</td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {parseFloat(r.miktar).toLocaleString('tr-TR')}
                </td>
                <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 750, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                  ₺{parseFloat(r.toplam).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderTop: '1px solid var(--border-light)',
          fontSize: 12.5,
        }}>
          <span style={{ color: 'var(--text-tertiary)' }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} / {data.length.toLocaleString('tr-TR')} kayıt
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setPage(0)} disabled={page === 0}
              style={{ padding: '4px 8px', border: '1px solid var(--border-medium)', borderRadius: 5, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontSize: 12 }}>«</button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              style={{ padding: '4px 10px', border: '1px solid var(--border-medium)', borderRadius: 5, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1, fontSize: 12 }}>‹ Önceki</button>
            <span style={{ padding: '4px 10px', fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              style={{ padding: '4px 10px', border: '1px solid var(--border-medium)', borderRadius: 5, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, fontSize: 12 }}>Sonraki ›</button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
              style={{ padding: '4px 8px', border: '1px solid var(--border-medium)', borderRadius: 5, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, fontSize: 12 }}>»</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Compute metrics from data ────────────────────────────────────────────────
export function computeMetrics(data) {
  const total = data.reduce((s, r) => s + (parseFloat(r.toplam) || 0), 0)
  const miktar = data.reduce((s, r) => s + (parseFloat(r.miktar) || 0), 0)
  const warehouses = new Set(data.map(r => r.cikis_ambari).filter(Boolean)).size
  const docs = new Set(data.map(r => r.dokuman_no).filter(Boolean)).size
  const orders = docs
  const avgOrder = orders > 0 ? total / orders : 0
  const activeDays = new Set(data.map(r => r.tarih && String(r.tarih).slice(0, 10)).filter(Boolean)).size
  const dailyAvg = activeDays > 0 ? total / activeDays : 0
  return { total, miktar, warehouses, docs, rows: data.length, orders, avgOrder, activeDays, dailyAvg }
}

export function groupByDate(data) {
  const map = {}
  data.forEach(r => {
    const d = r.dokuman_tarihi?.slice(0, 10) || 'Bilinmiyor'
    if (!map[d]) map[d] = { count: 0, toplam: 0 }
    map[d].count++
    map[d].toplam += parseFloat(r.toplam) || 0
  })
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
}

export function groupByField(data, field, valueField = 'toplam', limit = 8) {
  const map = {}
  data.forEach(r => {
    const k = r[field] || 'Bilinmiyor'
    if (!map[k]) map[k] = 0
    map[k] += parseFloat(r[valueField]) || 0
  })
  return Object.entries(map).map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value).slice(0, limit)
}

// ─── ApexChart wrapper ────────────────────────────────────────────────────────
export function ReportChart({ byDate, chartType = 'area', height = 220, title = 'Günlük Tutar Grafiği' }) {
  const { dark } = useContext(DarkModeContext)
  const chartInstance = useRef(null)

  const options = {
    chart: {
      type: chartType === 'bar' ? 'bar' : chartType,
      toolbar: { show: false }, zoom: { enabled: false },
      background: 'transparent', animations: { enabled: true, speed: 400 },
      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
      events: {
        mounted: (c) => { chartInstance.current = c },
        updated: (c) => { chartInstance.current = c },
      },
    },
    theme: { mode: dark ? 'dark' : 'light' },
    dataLabels: chartType === 'bar' ? {
      enabled: true,
      formatter: v => Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 0 }),
      style: { fontSize: '10px', fontWeight: 700, colors: ['#fff'] },
      dropShadow: { enabled: true, blur: 2, opacity: 0.5 },
      offsetY: -2,
    } : { enabled: false },
    stroke: chartType === 'bar' ? { show: false } : { show: true, curve: 'smooth', width: 2.5, colors: ['#2563eb'] },
    fill: chartType === 'area' ? {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.22, opacityTo: 0, stops: [0, 100] },
    } : { type: 'solid', opacity: 1 },
    colors: ['#2563eb'],
    grid: { borderColor: dark ? '#252a34' : '#e6e8ec', strokeDashArray: 3, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: byDate.map(([d]) => d.slice(5)),
      labels: { style: { colors: dark ? '#6b7385' : '#8a92a6', fontSize: '11px' }, rotate: -30 },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: dark ? '#6b7385' : '#8a92a6', fontSize: '11px' }, formatter: v => fmtTL(v) },
    },
    tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: v => fmtTL(v) } },
    plotOptions: chartType === 'bar' ? { bar: { borderRadius: 4, columnWidth: '60%' } } : {},
  }
  const series = [{ name: 'Toplam Tutar', data: byDate.map(([, v]) => v.toplam) }]

  function handlePng() {
    const svgEl = chartInstance.current?.el?.querySelector('svg')
    if (!svgEl) return
    const EXPORT_W = 1400
    const srcW = Math.max(1, parseFloat(svgEl.getAttribute('width')) || svgEl.clientWidth || 800)
    const srcH = Math.max(1, parseFloat(svgEl.getAttribute('height')) || svgEl.clientHeight || 400)
    const EXPORT_H = Math.round(EXPORT_W * srcH / srcW)
    const clone = svgEl.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    clone.setAttribute('viewBox', `0 0 ${srcW} ${srcH}`)
    clone.setAttribute('width', EXPORT_W)
    clone.setAttribute('height', EXPORT_H)
    const svgStr = new XMLSerializer().serializeToString(clone)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = EXPORT_W; canvas.height = EXPORT_H
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)
      ctx.drawImage(img, 0, 0, EXPORT_W, EXPORT_H)
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${title}.png`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }, 'image/png')
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`
  }

  function handleExcel() {
    const rows = [['Tarih', 'Toplam Tutar (₺)', 'Satır Sayısı']]
    byDate.forEach(([d, v]) => rows.push([d, v.toplam, v.count]))
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Veri')
    XLSX.writeFile(wb, `${title}.xlsx`)
  }

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: '0.3rem',
    background: 'var(--bg-hover)', border: '1px solid var(--border-light)',
    cursor: 'pointer', padding: '4px 10px',
    color: 'var(--text-secondary)', fontSize: '0.78rem', borderRadius: '6px',
    lineHeight: 1, flexShrink: 0, transition: 'all 150ms',
  }

  return (
    <div>
      <Chart key={chartType} options={options} series={series} type={chartType === 'bar' ? 'bar' : chartType} height={height} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem', paddingTop: '0.4rem' }}>
        <button style={btnStyle} onClick={handlePng} title="PNG indir"
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <i className="bi bi-image" /> PNG
        </button>
        <button style={btnStyle} onClick={handleExcel} title="Excel indir"
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <i className="bi bi-file-earmark-excel" /> Excel
        </button>
      </div>
    </div>
  )
}

// ─── Warehouse panel components ───────────────────────────────────────────────
export const WAREHOUSE_CHART_TYPES = [
  { value: 'bar',     label: 'Çubuk' },
  { value: 'donut',   label: 'Halka' },
  { value: 'pie',     label: 'Pasta' },
  { value: 'treemap', label: 'Ağaç' },
]

export const TOP_N_OPTIONS = [5, 8, 10, 15, 20]

export const PALETTE_BLUE    = ['#2563eb','#0ea5e9','#0284c7','#0369a1','#075985','#1e3a8a','#3b82f6','#60a5fa','#93c5fd','#bfdbfe']
export const PALETTE_GREEN   = ['#059669','#16a34a','#15803d','#10b981','#22c55e','#4ade80','#166534','#14532d','#34d399','#6ee7b7']
export const PALETTE_ORANGE  = ['#d97706','#f59e0b','#f97316','#ea580c','#dc2626','#b45309','#92400e','#fbbf24','#fb923c','#ef4444']
export const PALETTE_PURPLE  = ['#7c3aed','#9333ea','#a855f7','#c026d3','#d946ef','#e879f9','#6d28d9','#4c1d95','#8b5cf6','#a78bfa']
export const PALETTE_TEAL    = ['#0891b2','#06b6d4','#0e7490','#164e63','#22d3ee','#67e8f9','#0f766e','#14b8a6','#2dd4bf','#5eead4']
export const PALETTE_VIBRANT = ['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#ec4899','#14b8a6','#8b5cf6','#f59e0b']
export const PALETTE_MIXED   = ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#14b8a6','#6366f1','#eab308']

const PALETTE_OPTIONS = [
  { colors: PALETTE_BLUE,    swatch: '#2563eb', label: 'Mavi'    },
  { colors: PALETTE_GREEN,   swatch: '#059669', label: 'Yeşil'   },
  { colors: PALETTE_ORANGE,  swatch: '#d97706', label: 'Turuncu' },
  { colors: PALETTE_PURPLE,  swatch: '#7c3aed', label: 'Mor'     },
  { colors: PALETTE_TEAL,    swatch: '#0891b2', label: 'Turkuaz' },
  { colors: PALETTE_VIBRANT, swatch: null,      label: 'Canlı'   },
  { colors: PALETTE_MIXED,   swatch: null,      label: 'Karışık' },
]

export function SegPicker({ value, onChange, options }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg-main)', borderRadius: 6, padding: 2 }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '2px 8px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
          borderRadius: 4, transition: 'all 0.1s',
          background: value === o.value ? 'var(--bg-surface)' : 'transparent',
          color: value === o.value ? 'var(--text-primary)' : 'var(--text-tertiary)',
        }}>{o.value === 'bar' ? 'Çubuk' : o.label}</button>
      ))}
    </div>
  )
}

export class WarehousePanelBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: false } }
  static getDerivedStateFromError() { return { err: true } }
  componentDidUpdate(prev) {
    if (prev.chartType !== this.props.chartType || prev.topN !== this.props.topN) {
      this.setState({ err: false })
    }
  }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
        Grafik yüklenemedi — farklı bir tip deneyin.
      </div>
    )
    return this.props.children
  }
}

function WarehouseChart({ items, chartType, accentColor, palette }) {
  const { dark } = useContext(DarkModeContext)
  if (!items.length) return <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Veri yok</span>
  if (chartType === 'bar') return <BarList items={items} valueFormat={fmtTL} accentColor={accentColor} />
  const series = items.map(i => Math.round(i.value))
  const labels = items.map(i => i.label || 'Bilinmiyor')
  const baseOpts = {
    chart: { background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
    theme: { mode: dark ? 'dark' : 'light' },
    tooltip: { y: { formatter: v => fmtTL(v) } },
    dataLabels: { enabled: false },
    colors: palette,
    legend: {
      position: 'bottom', fontSize: '11px',
      itemMargin: { horizontal: 4, vertical: 2 },
      formatter: name => name.length > 22 ? name.slice(0, 22) + '…' : name,
    },
  }
  if (chartType === 'donut' || chartType === 'pie') {
    const height = Math.max(240, items.length * 22 + 80)
    return (
      <Chart key={`${chartType}-${items.length}`} type={chartType} height={height} series={series}
        options={{ ...baseOpts, labels, plotOptions: { pie: { donut: { size: '62%', labels: {
          show: chartType === 'donut',
          total: { show: true, label: 'Toplam', formatter: w => fmtTL(w.globals.seriesTotals.reduce((a,b)=>a+b,0)) },
          value: { formatter: v => fmtTL(Number(v)), fontSize: '13px', fontWeight: '700' },
        }}}}}} />
    )
  }
  if (chartType === 'treemap') {
    const height = Math.max(200, items.length * 26)
    return (
      <Chart key={`treemap-${items.length}`} type="treemap" height={height}
        series={[{ data: items.map(i => ({ x: i.label || 'Bilinmiyor', y: Math.round(i.value) })) }]}
        options={{ ...baseOpts, legend: { show: false }, plotOptions: { treemap: { distributed: true, enableShades: true, shadeIntensity: 0.25 } } }} />
    )
  }
  return null
}

// ─── TimeBreakdownTable ───────────────────────────────────────────────────────
export function TimeBreakdownTable({ data, groupBy }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
        Veri bulunamadı.
      </div>
    )
  }

  const formatDonem = (donem, gby) => {
    if (!donem) return '—'
    if (gby === 'gun') {
      const [y, m, d] = donem.split('-')
      const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
      return `${d} ${months[parseInt(m,10)-1]} ${y}`
    }
    if (gby === 'hafta') {
      return `${String(donem).slice(0,4)} — Hafta ${String(donem).slice(4)}`
    }
    if (gby === 'ay') {
      const [y, m] = donem.split('-')
      const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
      return `${months[parseInt(m,10)-1]} ${y}`
    }
    return donem
  }

  const grouped = []
  let currentDonem = null
  let currentGroup = null
  for (const row of data) {
    if (row.donem !== currentDonem) {
      currentDonem = row.donem
      currentGroup = { donem: row.donem, rows: [] }
      grouped.push(currentGroup)
    }
    currentGroup.rows.push(row)
  }

  const thStyle = {
    padding: '8px 12px', fontSize: 11, fontWeight: 700,
    color: 'var(--text-tertiary)', textTransform: 'uppercase',
    letterSpacing: '0.05em', textAlign: 'left',
    borderBottom: '1px solid var(--border-medium)',
    background: 'var(--bg-main)',
  }
  const tdStyle = {
    padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-light)',
  }
  const donemHeaderStyle = {
    padding: '10px 12px', fontSize: 12.5, fontWeight: 700,
    color: 'var(--text-secondary)', background: 'var(--bg-main)',
    borderBottom: '1px solid var(--border-medium)',
    borderTop: '2px solid var(--border-medium)',
    letterSpacing: '0.01em',
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-medium)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={thStyle}>Çıkış Ambarı</th>
            <th style={thStyle}>Stok Adı</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Miktar</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(group => (
            <React.Fragment key={group.donem}>
              <tr>
                <td colSpan={4} style={donemHeaderStyle}>
                  {formatDonem(group.donem, groupBy)}
                  <span style={{ marginLeft: 10, fontWeight: 400, color: 'var(--text-tertiary)', fontSize: 11.5 }}>
                    ({group.rows.length} kayıt)
                  </span>
                </td>
              </tr>
              {group.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover, rgba(0,0,0,0.02))' }}>
                  <td style={tdStyle}>{row.cikis_ambari || 'Belirtilmemiş'}</td>
                  <td style={tdStyle}>{row.stok_adi || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(row.miktar)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtTL(row.tutar)}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function WarehousePanel({ title, items, accentColor, palette, topN, onTopNChange, chartType, onChartTypeChange }) {
  const [activePalette, setActivePalette] = useState(palette)
  const dynamicAccent = activePalette[0] || accentColor

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Tutara göre top {topN}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {PALETTE_OPTIONS.map((opt, i) => (
              <button
                key={opt.label || i}
                title={opt.label}
                onClick={() => setActivePalette(opt.colors)}
                style={{
                  width: 13, height: 13, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
                  background: opt.swatch
                    ? opt.swatch
                    : `conic-gradient(${opt.colors.slice(0, 4).map((c, j) => `${c} ${j * 25}% ${(j + 1) * 25}%`).join(', ')})`,
                  outline: activePalette === opt.colors ? '2px solid var(--text-primary)' : '2px solid transparent',
                  outlineOffset: 1,
                  transition: 'transform 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.25)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
              />
            ))}
          </div>
          <div style={{ display: 'inline-flex', background: 'var(--bg-main)', borderRadius: 6, padding: 2 }}>
            {TOP_N_OPTIONS.map(n => (
              <button key={n} onClick={() => onTopNChange(n)} style={{
                padding: '2px 8px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                borderRadius: 4, transition: 'all 0.1s',
                background: topN === n ? 'var(--bg-surface)' : 'transparent',
                color: topN === n ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}>Top {n}</button>
            ))}
          </div>
          <SegPicker value={chartType} onChange={onChartTypeChange} options={WAREHOUSE_CHART_TYPES} />
        </div>
      </div>
      <WarehousePanelBoundary chartType={chartType} topN={topN}>
        <WarehouseChart items={items} chartType={chartType} accentColor={dynamicAccent} palette={activePalette} />
      </WarehousePanelBoundary>
    </div>
  )
}

export function LoadingBadge({ show }) {
  if (!show) return null
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      backdropFilter: 'blur(3px)',
      WebkitBackdropFilter: 'blur(3px)',
      background: 'rgba(var(--bg-main-rgb, 248,249,250), 0.35)',
      borderRadius: 12,
    }}>
      <span className="loading-badge">
        <span className="loading-spinner" />
        Yükleniyor…
      </span>
    </div>
  )
}
