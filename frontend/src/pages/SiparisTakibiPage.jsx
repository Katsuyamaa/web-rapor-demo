import { useState, useEffect, useRef } from 'react'
import client from '../api/client'

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block',
}
const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid var(--border-medium)',
  borderRadius: 8, fontSize: '0.875rem', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none',
}

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const REFRESH_OPTIONS = [
  { label: 'Kapalı', value: 0 },
  { label: '1 dk',   value: 60 },
  { label: '5 dk',   value: 300 },
  { label: '10 dk',  value: 600 },
]

export default function SiparisTakibiPage() {
  const [date, setDate]               = useState(tomorrow())
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [search, setSearch]           = useState('')
  const [searchBek, setSearchBek]     = useState('')
  const [refreshSec, setRefreshSec]   = useState(0)
  const timerRef                      = useRef(null)

  async function fetchData(d) {
    setLoading(true)
    try {
      const res = await client.get('/siparis-takibi', { params: { date: d } })
      setData(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(date) }, [date])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (refreshSec > 0) {
      timerRef.current = setInterval(() => fetchData(date), refreshSec * 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [refreshSec, date])

  const verenler = data?.siparis_verenler || []
  const bekleyenler = data?.bekleyenler || []
  const ozet = data?.ozet || {}

  const filteredVeren = verenler.filter(r =>
    r.branch.toLowerCase().includes(search.toLowerCase())
  )
  const filteredBek = bekleyenler.filter(b =>
    b.toLowerCase().includes(searchBek.toLowerCase())
  )

  const fmtTime = iso => iso ? iso.slice(11, 16) : '—'
  const fmtNum  = v => Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 0 })

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        Sipariş Takibi
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '1.25rem' }}>
        Hangi şubeler sipariş geçti, hangisi beklemede.
        {data?.last_fetch && (
          <span style={{ marginLeft: '1rem' }}>Son güncelleme: {data.last_fetch.slice(11, 16)}</span>
        )}
        {data?.cutoff && (
          <span style={{ marginLeft: '0.75rem', color: '#f59e0b' }}>Kesim saati: {data.cutoff}</span>
        )}
      </p>

      {/* Üst kontroller */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 160 }}>
          <label style={labelStyle}>Tarih</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={labelStyle}>Otomatik Yenile</label>
          <select
            value={refreshSec}
            onChange={e => setRefreshSec(Number(e.target.value))}
            style={inputStyle}
          >
            {REFRESH_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => fetchData(date)}
          disabled={loading}
          style={{
            padding: '0.6rem 1.2rem', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            alignSelf: 'flex-end',
          }}
        >
          {loading ? 'Yükleniyor...' : '↻ Yenile'}
        </button>
      </div>

      {/* KPI kartları */}
      {data && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Toplam Şube',   value: ozet.toplam,   color: 'var(--text-primary)', bg: 'var(--bg-surface)' },
            { label: 'Sipariş Veren', value: ozet.veren,    color: '#16a34a',             bg: '#f0fdf4' },
            { label: 'Geç Gelen',     value: ozet.gec,      color: '#f59e0b',             bg: '#fffbeb' },
            { label: 'Bekleyen',      value: ozet.bekleyen, color: '#dc2626',             bg: '#fef2f2' },
          ].map(k => (
            <div key={k.label} style={{
              background: k.bg, border: '1px solid var(--border-medium)',
              borderRadius: 10, padding: '0.75rem 1.25rem', minWidth: 110,
            }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: k.color }}>{k.value ?? '—'}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sipariş Verenler */}
      {data && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.6rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#16a34a' }}>
              ✅ Sipariş Verenler ({filteredVeren.length})
            </span>
            <input
              placeholder="Şube ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, width: 200 }}
            />
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-medium)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-surface)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)' }}>
                  {['Şube', 'İlk Sipariş', 'Ürün Sayısı', 'Toplam Miktar'].map(h => (
                    <th key={h} style={{
                      padding: '7px 12px', fontSize: 11, fontWeight: 700,
                      color: 'var(--text-tertiary)', textTransform: 'uppercase',
                      letterSpacing: '0.05em', textAlign: h === 'Şube' ? 'left' : 'right',
                      borderBottom: '1px solid var(--border-medium)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVeren.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    Sipariş veren şube bulunamadı
                  </td></tr>
                )}
                {filteredVeren.map((r, i) => (
                  <tr key={r.branch} style={{
                    background: r.gec_mi
                      ? 'rgba(245,158,11,0.08)'
                      : i % 2 === 0 ? 'transparent' : 'var(--bg-hover, rgba(0,0,0,0.02))',
                  }}>
                    <td style={{ padding: '7px 12px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {r.gec_mi && <span style={{ marginRight: '0.4rem' }} title="Geç sipariş">⚠️</span>}
                      {r.branch}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'right', color: r.gec_mi ? '#f59e0b' : 'var(--text-secondary)', fontWeight: r.gec_mi ? 600 : 400 }}>
                      {fmtTime(r.first_seen_at)}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {r.urun_sayisi}
                    </td>
                    <td style={{ padding: '7px 12px', fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                      {fmtNum(r.toplam_miktar)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bekleyenler */}
      {data && bekleyenler.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.6rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#dc2626' }}>
              ⏳ Bekleyenler ({filteredBek.length})
            </span>
            <input
              placeholder="Şube ara..."
              value={searchBek}
              onChange={e => setSearchBek(e.target.value)}
              style={{ ...inputStyle, width: 200 }}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {filteredBek.map(b => (
              <span key={b} style={{
                padding: '4px 12px', background: '#fef2f2', color: '#dc2626',
                border: '1px solid #fecaca', borderRadius: 20,
                fontSize: '0.8rem', fontWeight: 500,
              }}>{b}</span>
            ))}
          </div>
        </div>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Yükleniyor...
        </div>
      )}
    </div>
  )
}
