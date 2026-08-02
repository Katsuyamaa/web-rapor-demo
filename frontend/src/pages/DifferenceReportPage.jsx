import { useState, useEffect, useCallback } from 'react'
import client from '../api/client'
import MultiSelect from '../components/ui/MultiSelect'
import { periodToDates, fmt } from '../components/ui/ReportComponents'

const PAGE_SIZE = 100

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block',
}
const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid var(--border-medium)',
  borderRadius: 8, fontSize: '0.875rem', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
}

const QUICK_PERIODS = [
  { label: 'Bugün',    value: 'bugun' },
  { label: 'Bu Hafta', value: 'hafta' },
  { label: 'Bu Ay',    value: 'ay' },
  { label: 'Bu Yıl',   value: 'yil' },
]

const STATUS_FILTERS = [
  { value: 'all',   label: 'Tümü' },
  { value: 'eksik', label: 'Eksik' },
  { value: 'fazla', label: 'Fazla' },
  { value: 'tam',   label: 'Tam' },
]

const DURUM_STYLE = {
  eksik: { bg: 'rgba(220,38,38,0.12)', color: '#dc2626', label: 'Eksik' },
  fazla: { bg: 'rgba(234,179,8,0.15)', color: '#b45309', label: 'Fazla' },
  tam:   { bg: 'rgba(22,163,74,0.12)', color: '#16a34a', label: 'Tam' },
}

function DurumBadge({ durum }) {
  const s = DURUM_STYLE[durum] || DURUM_STYLE.tam
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 5,
      fontSize: 11, fontWeight: 700, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function FarkCell({ fark }) {
  if (fark === 0) return <span style={{ color: 'var(--text-tertiary)' }}>0</span>
  const pos = fark > 0
  return (
    <span style={{ fontWeight: 600, color: pos ? '#b45309' : '#dc2626' }}>
      {pos ? '+' : ''}{fmt(fark)}
    </span>
  )
}

function buildParams(filters) {
  const p = new URLSearchParams()
  if (filters.start) p.set('start', filters.start)
  if (filters.end)   p.set('end',   filters.end)
  if (filters.cikis.length) p.set('cikis', filters.cikis.join(','))
  if (filters.giris.length) p.set('giris', filters.giris.join(','))
  if (filters.stok.length)  p.set('stok',  filters.stok.join(','))
  return p
}

export default function DifferenceReportPage() {
  const [filters, setFilters] = useState({ start: '', end: '', cikis: [], giris: [], stok: [] })
  const [options, setOptions] = useState({ cikis_ambari: [], giris_ambari: [], stok_adi: [] })
  const [data, setData] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePeriod, setActivePeriod] = useState(null)
  const [page, setPage] = useState(0)

  useEffect(() => {
    client.get('/filters').then(r => setOptions(r.data)).catch(() => {})
    applyPeriod('ay')
  }, [])

  const applyPeriod = (value) => {
    const { start, end } = periodToDates(value)
    setFilters(f => ({ ...f, start, end }))
    setActivePeriod(value)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await client.get(`/fark_analizi?${buildParams(filters).toString()}`)
      setData(r.data.data || [])
      setPage(0)
      setStatusFilter('all')
    } catch {
      setError('Veri yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const downloadExcel = async () => {
    setExcelLoading(true)
    try {
      const resp = await client.get(`/fark_analizi_excel?${buildParams(filters).toString()}`, { responseType: 'blob' })
      const url = URL.createObjectURL(resp.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `fark_analizi_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Excel indirilemedi.')
    } finally {
      setExcelLoading(false)
    }
  }

  const openPreview = () => {
    window.open(`/preview_fark?${buildParams(filters).toString()}`, '_blank')
  }

  const displayed = statusFilter === 'all' ? data : data.filter(r => r.durum === statusFilter)

  const counts = {
    all:   data.length,
    eksik: data.filter(r => r.durum === 'eksik').length,
    fazla: data.filter(r => r.durum === 'fazla').length,
    tam:   data.filter(r => r.durum === 'tam').length,
  }

  const totalPages = Math.ceil(displayed.length / PAGE_SIZE)
  const slice = displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const thStyle = {
    padding: '8px 12px', fontSize: 11, fontWeight: 700,
    color: 'var(--text-tertiary)', textTransform: 'uppercase',
    letterSpacing: '0.05em', textAlign: 'left',
    borderBottom: '1px solid var(--border-medium)',
    background: 'var(--bg-main)', whiteSpace: 'nowrap',
    position: 'sticky', top: 0, zIndex: 1,
  }
  const tdStyle = {
    padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap',
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        Fark Analizi
        <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '0.75rem' }}>
          Talep edilen — gerçekleşen miktar farkı
        </span>
      </h2>

      {/* Filtre Paneli */}
      <section style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
        borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        {/* Hızlı dönem */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {QUICK_PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => applyPeriod(p.value)}
              className="pressable"
              style={{
                padding: '0.3rem 0.85rem', borderRadius: 6, fontSize: '0.8rem',
                border: '1.5px solid',
                borderColor: activePeriod === p.value ? 'var(--primary)' : 'var(--border-medium)',
                background: activePeriod === p.value ? 'rgba(37,99,235,0.1)' : 'transparent',
                color: activePeriod === p.value ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontWeight: activePeriod === p.value ? 600 : 400,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tarih + filtreler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Başlangıç</label>
            <input type="date" style={inputStyle} value={filters.start}
              onChange={e => { setFilters(f => ({ ...f, start: e.target.value })); setActivePeriod(null) }} />
          </div>
          <div>
            <label style={labelStyle}>Bitiş</label>
            <input type="date" style={inputStyle} value={filters.end}
              onChange={e => { setFilters(f => ({ ...f, end: e.target.value })); setActivePeriod(null) }} />
          </div>
          <div>
            <label style={labelStyle}>Çıkış Ambarı</label>
            <MultiSelect
              options={options.cikis_ambari}
              value={filters.cikis}
              onChange={v => setFilters(f => ({ ...f, cikis: v }))}
              placeholder="Tümü"
            />
          </div>
          <div>
            <label style={labelStyle}>Giriş Ambarı</label>
            <MultiSelect
              options={options.giris_ambari}
              value={filters.giris}
              onChange={v => setFilters(f => ({ ...f, giris: v }))}
              placeholder="Tümü"
            />
          </div>
          <div>
            <label style={labelStyle}>Stok</label>
            <MultiSelect
              options={options.stok_adi}
              value={filters.stok}
              onChange={v => setFilters(f => ({ ...f, stok: v }))}
              placeholder="Tümü"
            />
          </div>
        </div>

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-primary pressable"
            style={{ flex: 2, padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            {loading && (
              <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            )}
            {loading ? 'Yükleniyor…' : 'Sorgula'}
          </button>
          <button
            onClick={downloadExcel}
            disabled={excelLoading || data.length === 0}
            className="btn-secondary pressable"
            style={{ flex: 1, padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
          >
            {excelLoading ? '…' : '📥'} Excel
          </button>
          <button
            onClick={openPreview}
            disabled={data.length === 0}
            className="btn-secondary pressable"
            style={{ flex: 1, padding: '0.55rem 1rem', borderRadius: 8, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
          >
            🖨️ Önizleme
          </button>
        </div>
      </section>

      {error && (
        <div style={{
          background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
          color: '#dc2626', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Durum toggle */}
      {data.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(sf => (
            <button
              key={sf.value}
              onClick={() => { setStatusFilter(sf.value); setPage(0) }}
              className="pressable"
              style={{
                padding: '0.3rem 0.9rem', borderRadius: 20, fontSize: '0.8rem',
                border: '1.5px solid',
                borderColor: statusFilter === sf.value ? 'var(--primary)' : 'var(--border-medium)',
                background: statusFilter === sf.value ? 'rgba(37,99,235,0.1)' : 'transparent',
                color: statusFilter === sf.value ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontWeight: statusFilter === sf.value ? 700 : 400,
              }}
            >
              {sf.label}
              <span style={{
                marginLeft: '0.4rem', fontSize: 10, fontWeight: 700,
                background: statusFilter === sf.value ? 'var(--primary)' : 'var(--border-medium)',
                color: statusFilter === sf.value ? '#fff' : 'var(--text-tertiary)',
                borderRadius: 10, padding: '1px 6px',
              }}>
                {counts[sf.value]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tablo */}
      {data.length === 0 && !loading ? (
        <div style={{
          textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)',
          fontSize: '0.9rem', background: 'var(--bg-surface)',
          border: '1px solid var(--border-light)', borderRadius: 12,
        }}>
          Listelemek için filtre seçip "Sorgula" butonuna basın.
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
          borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Tarih</th>
                  <th style={thStyle}>Belge No</th>
                  <th style={thStyle}>Çıkış Ambarı</th>
                  <th style={thStyle}>Giriş Ambarı</th>
                  <th style={thStyle}>Stok</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Talep</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Gerçekleşen</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Fark</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {slice.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                      Bu durumda kayıt yok.
                    </td>
                  </tr>
                ) : slice.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-main)' }}>
                    <td style={tdStyle}>{r.dokuman_tarihi}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{r.dokuman_no}</td>
                    <td style={tdStyle}>{r.cikis_ambari || '—'}</td>
                    <td style={tdStyle}>{r.giris_ambari || '—'}</td>
                    <td style={{ ...tdStyle, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.stok_adi || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.talep_edilen_miktar)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(r.miktar)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}><FarkCell fark={r.fark} /></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><DurumBadge durum={r.durum} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer: kayıt sayısı + sayfalama */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.5rem 1rem', fontSize: '0.78rem', color: 'var(--text-tertiary)',
            borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <span>
              {displayed.length} kayıt
              {statusFilter !== 'all' ? ` (toplam ${data.length} içinden)` : ''}
            </span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="pressable"
                  style={{
                    padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border-medium)',
                    background: 'var(--bg-surface)', cursor: page === 0 ? 'not-allowed' : 'pointer',
                    opacity: page === 0 ? 0.4 : 1, fontSize: 12,
                  }}
                >‹</button>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="pressable"
                  style={{
                    padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border-medium)',
                    background: 'var(--bg-surface)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                    opacity: page === totalPages - 1 ? 0.4 : 1, fontSize: 12,
                  }}
                >›</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
