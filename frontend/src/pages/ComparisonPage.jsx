import { useState, useEffect } from 'react'
import client from '../api/client'
import MultiSelect from '../components/ui/MultiSelect'
import { fmt, fmtTL, periodToDates, LoadingBadge } from '../components/ui/ReportComponents'

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block',
}
const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid var(--border-medium)',
  borderRadius: 8, fontSize: '0.875rem', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none',
}

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'

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

const QUICK_PERIODS = [
  { label: 'Son 7 Gün',  value: 'son7' },
  { label: 'Bu Ay',      value: 'ay' },
  { label: 'Geçen Ay',   value: 'gecenAy' },
  { label: 'Bu Yıl',     value: 'yil' },
]

function calcPrevPeriod(start, end) {
  if (!start || !end) return { start: '', end: '' }
  const d1 = new Date(start)
  const d2 = new Date(end)
  const days = Math.round((d2 - d1) / 86400000) + 1
  const prevEnd = new Date(d1)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - days + 1)
  const fmtD = d => d.toISOString().slice(0, 10)
  return { start: fmtD(prevStart), end: fmtD(prevEnd) }
}

function diffPct(d1, d2) {
  if (!d2) return null
  return ((d1 - d2) / Math.abs(d2)) * 100
}

function DiffBadge({ d1, d2 }) {
  const pct = diffPct(d1, d2)
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

function KpiCard({ label, d1, d2, formatter }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 12,
      border: '1px solid var(--border-medium)', padding: '16px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flex: 1, minWidth: 180,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 750, color: 'var(--text-primary)', marginBottom: 4 }}>
        {formatter(d1)}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 6 }}>
        Dönem 2: {formatter(d2)}
      </div>
      <DiffBadge d1={d1} d2={d2} />
    </div>
  )
}

export default function ComparisonPage() {
  const [p1, setP1] = useState({ start: firstOfMonth, end: today })
  const [p2, setP2] = useState(() => calcPrevPeriod(firstOfMonth, today))
  const [p2Manual, setP2Manual] = useState(false)

  const [filters, setFilters] = useState({ cikis: [], giris: [], stok: [] })
  const [options, setOptions] = useState({ cikis_ambari: [], giris_ambari: [], stok_adi: [] })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/filters').then(r => setOptions(r.data)).catch(() => {})
  }, [])

  const applyQuick = (value) => {
    let start, end
    if (value === 'son7') {
      const d = new Date(); d.setDate(d.getDate() - 6)
      start = d.toISOString().slice(0, 10); end = today
    } else {
      const dates = periodToDates(value)
      start = dates.start; end = dates.end
    }
    setP1({ start, end })
    setP2(calcPrevPeriod(start, end))
    setP2Manual(false)
  }

  const handleP1Change = (field, val) => {
    const next = { ...p1, [field]: val }
    setP1(next)
    if (!p2Manual) setP2(calcPrevPeriod(next.start, next.end))
  }

  const handleP2Change = (field, val) => {
    setP2(prev => ({ ...prev, [field]: val }))
    setP2Manual(true)
  }

  const query = async () => {
    if (!p1.start || !p1.end || !p2.start || !p2.end) {
      setError('Lütfen her iki dönem için başlangıç ve bitiş tarihi girin.')
      return
    }
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({
        start1: p1.start, end1: p1.end,
        start2: p2.start, end2: p2.end,
        cikis: filters.cikis.join(','),
        giris: filters.giris.join(','),
        stok:  filters.stok.join(','),
      })
      const res = await client.get('/comparison?' + params)
      setResult(res.data)
    } catch {
      setError('Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  const summary = result?.summary
  const rows = result?.rows || []

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Dönem Karşılaştırması
        </h1>
        <p style={{ color: 'var(--text-tertiary)', marginTop: 4, fontSize: 13.5 }}>
          İki farklı dönemi miktar, tutar ve işlem sayısı bazında karşılaştırın.
        </p>
      </div>

      <section style={{ background: 'var(--bg-surface)', padding: '20px 24px', borderRadius: 14, border: '1px solid var(--border-medium)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Hızlı Dönem Seçimi (Dönem 1)</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {QUICK_PERIODS.map(p => (
              <button key={p.value} onClick={() => applyQuick(p.value)} style={{
                padding: '6px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
                background: 'var(--bg-main)', color: 'var(--text-secondary)',
                border: '1px solid var(--border-medium)', transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Dönem 1 — Başlangıç</label>
            <input type="date" value={p1.start} onChange={e => handleP1Change('start', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Dönem 1 — Bitiş</label>
            <input type="date" value={p1.end} onChange={e => handleP1Change('end', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              Dönem 2 — Başlangıç
              {!p2Manual && <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--text-tertiary)', textTransform: 'none' }}>(otomatik)</span>}
            </label>
            <input type="date" value={p2.start} onChange={e => handleP2Change('start', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              Dönem 2 — Bitiş
              {!p2Manual && <span style={{ marginLeft: 6, fontWeight: 400, color: 'var(--text-tertiary)', textTransform: 'none' }}>(otomatik)</span>}
            </label>
            <input type="date" value={p2.end} onChange={e => handleP2Change('end', e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <MultiSelect label="Çıkış Ambarı" options={options.cikis_ambari} value={filters.cikis} onChange={v => setFilters(f => ({ ...f, cikis: v }))} />
          <MultiSelect label="Giriş Ambarı"  options={options.giris_ambari} value={filters.giris} onChange={v => setFilters(f => ({ ...f, giris: v }))} />
          <MultiSelect label="Stok Adı"      options={options.stok_adi}     value={filters.stok}  onChange={v => setFilters(f => ({ ...f, stok:  v }))} />
        </div>

        {p2Manual && (
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => { setP2(calcPrevPeriod(p1.start, p1.end)); setP2Manual(false) }}
              style={{ fontSize: 12, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              Dönem 2'yi otomatik sıfırla
            </button>
          </div>
        )}

        <button onClick={query} disabled={loading} className="btn-primary"
          style={{ minWidth: 140, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {loading ? 'Sorgulanıyor…' : 'Sorgula'}
        </button>
      </section>

      {error && <div style={{ color: '#dc2626', padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ position: 'relative', minHeight: loading ? 120 : 0 }}>
        <LoadingBadge show={loading} />

      {summary && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <KpiCard label="Toplam Miktar"  d1={summary.d1.miktar} d2={summary.d2.miktar} formatter={fmt} />
          <KpiCard label="Toplam Tutar"   d1={summary.d1.tutar}  d2={summary.d2.tutar}  formatter={fmtTL} />
          <KpiCard label="İşlem Sayısı"   d1={summary.d1.islem}  d2={summary.d2.islem}  formatter={n => n == null ? '—' : Number(n).toLocaleString('tr-TR')} />
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-medium)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-medium)', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            {rows.length.toLocaleString('tr-TR')} kayıt · Dönem 1: {p1.start} – {p1.end} / Dönem 2: {p2.start} – {p2.end}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Çıkış Ambarı</th>
                  <th style={thStyle}>Stok Adı</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>D1 Miktar</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>D2 Miktar</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Fark %</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>D1 Tutar</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>D2 Tutar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const pct = diffPct(row.d1_miktar, row.d2_miktar)
                  const pctColor = pct === null || pct === 0 ? 'var(--text-tertiary)' : pct > 0 ? '#16a34a' : '#dc2626'
                  const pctText = pct === null ? '—' : `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`
                  return (
                    <tr key={`${row.cikis_ambari}|${row.stok_adi}|${i}`} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover, rgba(0,0,0,0.02))' }}>
                      <td style={tdStyle}>{row.cikis_ambari}</td>
                      <td style={tdStyle}>{row.stok_adi}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(row.d1_miktar)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)' }}>{fmt(row.d2_miktar)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: pctColor }}>{pctText}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtTL(row.d1_tutar)}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)' }}>{fmtTL(row.d2_tutar)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Seçili filtrelerde veri bulunamadı.
        </div>
      )}
      </div>{/* end loading wrapper */}
    </div>
  )
}
