import { useState, useEffect, useMemo, useRef } from 'react'
import ReactApexChart from 'react-apexcharts'
import client from '../api/client'
import MultiSelect from '../components/ui/MultiSelect'
import { fmtTL, PeriodTabs, periodToDates } from '../components/ui/ReportComponents'

const GRANULARITY_OPTIONS = [
  { value: 'gun',   label: 'Gün' },
  { value: 'hafta', label: 'Hafta' },
  { value: 'ay',    label: 'Ay' },
]

const PERIODS = [
  { value: 'bugun',      label: 'Bugün' },
  { value: 'hafta',      label: 'Bu Hafta' },
  { value: 'ay',         label: 'Bu Ay' },
  { value: 'gecenAy',    label: 'Geçen Ay' },
  { value: 'son30',      label: 'Son 30 Gün' },
  { value: 'yil',        label: 'Bu Yıl' },
  { value: 'ozel',       label: 'Özel' },
]

const AY_KISALTMA = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function formatLabel(label, granularity) {
  if (granularity === 'ay') return AY_KISALTMA[Number(label)] || label
  if (granularity === 'hafta') return `H${label}`
  return label
}

function fmtRange(range) {
  if (!range || range.length < 2) return '—'
  const fmt = d => {
    const parts = d.split('-')
    return `${parts[2]}.${parts[1]}.${parts[0]}`
  }
  return `${fmt(range[0])} – ${fmt(range[1])}`
}

function yearOf(range) {
  return range?.[0]?.split('-')[0] || '—'
}

function diffPct(a, b) {
  if (!b) return null
  return ((a - b) / Math.abs(b)) * 100
}

function DiffBadge({ thisYear, lastYear }) {
  const pct = diffPct(thisYear, lastYear)
  if (pct === null) return <span style={{ color: 'var(--text-tertiary)' }}>—</span>
  const pos = pct >= 0
  const color = pct === 0 ? 'var(--text-tertiary)' : pos ? '#16a34a' : '#dc2626'
  const arrow = pct === 0 ? '—' : pos ? '▲' : '▼'
  return (
    <span style={{ color, fontWeight: 700, fontSize: 13 }}>
      {arrow} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function KpiCard({ label, sublabel, value, sub, subLabel }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 12,
      border: '1px solid var(--border-medium)', padding: '16px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flex: 1, minWidth: 180,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>
          {sublabel}
        </div>
      )}
      <div style={{ fontSize: 20, fontWeight: 750, color: 'var(--text-primary)', marginBottom: 4 }}>
        {value}
      </div>
      {sub !== undefined && (
        <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>
          {subLabel}: {sub}
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block',
}
const inputStyle = {
  padding: '0.5rem 0.75rem', border: '1.5px solid var(--border-medium)',
  borderRadius: 8, fontSize: '0.875rem', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none',
}

export default function CiroKarsilastirmaPage() {
  const [granularity, setGranularity] = useState('ay')
  const [period, setPeriod] = useState('yil')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [ambarOptions, setAmbarOptions] = useState([])
  const [selectedAmbars, setSelectedAmbars] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const firstLoad = useRef(true)

  useEffect(() => {
    client.get('/filters').then(r => {
      const opts = r.data.cikis_ambari || []
      setAmbarOptions(opts)
      setSelectedAmbars(opts)
    }).catch(() => {})
  }, [])

  const effectiveDates = useMemo(() => {
    if (period === 'ozel') return { start: customStart, end: customEnd }
    return periodToDates(period)
  }, [period, customStart, customEnd])

  useEffect(() => {
    if (!effectiveDates.start || !effectiveDates.end) return
    const ambarParam = selectedAmbars.length > 0 && selectedAmbars.length < ambarOptions.length
      ? selectedAmbars.join(',')
      : ''
    const params = new URLSearchParams({ granularity, start: effectiveDates.start, end: effectiveDates.end })
    if (ambarParam) params.set('ambarlar', ambarParam)

    // İlk yüklemede tam loading, sonrasında sadece refreshing (eski içerik görünür)
    if (firstLoad.current) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }
    setError('')

    client.get('/ciro_karsilastirma?' + params)
      .then(r => {
        setData(r.data)
        firstLoad.current = false
      })
      .catch(() => setError('Veriler yüklenemedi.'))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [granularity, effectiveDates, selectedAmbars, ambarOptions.length])

  const summary    = data?.summary
  const chartRows  = data?.chart      || []
  const warehouses = data?.warehouses || []
  const meta       = data?.meta

  const thisYearLabel = meta ? fmtRange(meta.this_year_range) : 'Bu Yıl'
  const lastYearLabel = meta ? fmtRange(meta.last_year_range) : 'Geçen Yıl'
  const thisYearYear  = meta ? yearOf(meta.this_year_range) : 'Bu Yıl'
  const lastYearYear  = meta ? yearOf(meta.last_year_range) : 'Geçen Yıl'

  const chartOptions = useMemo(() => ({
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
    plotOptions: { bar: { columnWidth: '65%', borderRadius: 3 } },
    colors: ['#2563eb', '#94a3b8'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartRows.map(r => formatLabel(r.label, granularity)),
      labels: { style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: {
        formatter: v => {
          if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
          if (v >= 1_000)     return (v / 1_000).toFixed(0) + 'K'
          return String(v)
        }
      }
    },
    tooltip: {
      y: { formatter: v => fmtTL(v) },
      shared: true,
      intersect: false,
    },
    legend: { position: 'top', fontSize: '12px' },
    grid: { borderColor: 'var(--border-light, #e5e7eb)' },
  }), [chartRows, granularity])

  const chartSeries = [
    { name: thisYearYear, data: chartRows.map(r => r.this_year) },
    { name: lastYearYear, data: chartRows.map(r => r.last_year) },
  ]

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

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Ciro Karşılaştırması
        </h1>
        <p style={{ color: 'var(--text-tertiary)', marginTop: 4, fontSize: 13.5 }}>
          {meta
            ? `${meta.this_year_range[0]} – ${meta.this_year_range[1]} · Geçen yılın aynı dönemi ile karşılaştırma`
            : 'Seçilen dönem vs geçen yılın aynı dönemi'}
        </p>
      </div>

      {/* Kontroller */}
      <section style={{
        background: 'var(--bg-surface)', padding: '16px 20px', borderRadius: 14,
        border: '1px solid var(--border-medium)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        marginBottom: 16,
      }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Dönem</label>
          <PeriodTabs value={period} onChange={p => setPeriod(p)} options={PERIODS} />
          {period === 'ozel' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>Başlangıç</label>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Bitiş</label>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Görünüm</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {GRANULARITY_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setGranularity(o.value)}
                    style={{
                      padding: '6px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
                      background: granularity === o.value ? 'var(--primary, #2563eb)' : 'var(--bg-main)',
                      color: granularity === o.value ? '#fff' : 'var(--text-secondary)',
                      border: granularity === o.value ? '1px solid var(--primary, #2563eb)' : '1px solid var(--border-medium)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ minWidth: 240 }}>
              <MultiSelect
                label="Ambar"
                options={ambarOptions}
                value={selectedAmbars}
                onChange={setSelectedAmbars}
              />
            </div>
          </div>

          {/* Bilgi kutusu — sağ taraf */}
          <div style={{
            background: 'rgba(37,99,235,0.05)', borderRadius: 10,
            border: '1px solid rgba(37,99,235,0.15)', padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 270,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-info-circle-fill" style={{ color: '#2563eb', fontSize: 13, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>Nasıl çalışır?</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Seçilen dönem, <strong>bir önceki yılın aynı dönemi</strong> ile karşılaştırılır.
            </p>
            {meta && (
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
                <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#2563eb', marginRight: 5, verticalAlign: 'middle' }} /><strong>{thisYearYear}:</strong> {fmtRange(meta.this_year_range)}</div>
                <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#94a3b8', marginRight: 5, verticalAlign: 'middle' }} /><strong>{lastYearYear}:</strong> {fmtRange(meta.last_year_range)}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div style={{ color: '#dc2626', padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* İlk yüklemede tam spinner */}
      {loading && !data && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Yükleniyor…</div>
      )}

      {/* Veri varsa içerik — filtre değişiminde eski içerik görünür, sadece opacity azalır */}
      {summary && (
        <div style={{ position: 'relative' }}>
          {refreshing && (
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
          )}
        <div style={{ opacity: refreshing ? 0.55 : 1, transition: 'opacity 0.2s', pointerEvents: refreshing ? 'none' : 'auto' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <KpiCard
              label="Seçilen Dönem"
              sublabel={thisYearLabel}
              value={fmtTL(summary.this_year.total)}
            />
            <KpiCard
              label="Önceki Yıl"
              sublabel={lastYearLabel}
              value={fmtTL(summary.last_year.total)}
            />
            <KpiCard
              label="Değişim"
              value={<DiffBadge thisYear={summary.this_year.total} lastYear={summary.last_year.total} />}
              sub={fmtTL(Math.abs(summary.this_year.total - summary.last_year.total))}
              subLabel="Fark"
            />
          </div>

          {chartRows.length > 0 && (
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-medium)',
              padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
              <ReactApexChart
                options={chartOptions}
                series={chartSeries}
                type="bar"
                height={320}
              />
            </div>
          )}

          {warehouses.length > 0 && (
            <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-medium)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-medium)', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                Ambar Bazlı Özet — {warehouses.length} ambar
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Ambar</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{thisYearYear}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>{lastYearYear}</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Fark %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouses.map((row, i) => (
                      <tr key={row.ambar} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover, rgba(0,0,0,0.02))' }}>
                        <td style={tdStyle}>{row.ambar}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtTL(row.this_year)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)' }}>{fmtTL(row.last_year)}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <DiffBadge thisYear={row.this_year} lastYear={row.last_year} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {!loading && !refreshing && data && chartRows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Seçili filtrelerde veri bulunamadı.
        </div>
      )}
    </div>
  )
}
