import { useState, useEffect, useCallback } from 'react'
import MultiSelect from '../../components/ui/MultiSelect'
import { periodToDates, LoadingBadge } from '../../components/ui/ReportComponents'
import { getWarehouses, getReportProducts, getCostReport, getCostReportExcelUrl } from '../../api/cost'

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block',
}
const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid var(--border-medium)',
  borderRadius: 8, fontSize: '0.875rem', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none',
}

const QUICK_PERIODS = [
  { label: 'Bugün',       value: 'bugun' },
  { label: 'Dün',         value: 'dun' },
  { label: 'Bu Hafta',    value: 'hafta' },
  { label: 'Geçen Hafta', value: 'gecenHafta' },
  { label: 'Bu Ay',       value: 'ay' },
  { label: 'Geçen Ay',    value: 'gecenAy' },
  { label: 'Son 30 Gün',  value: 'son30' },
  { label: 'Bu Yıl',      value: 'yil' },
]

const COL_LABELS = {
  uretim: 'Üretim', sevkiyat: 'Sevkiyat', yemekhane: 'Yemekhane',
  online: 'Online', ikram: 'İkram', zayii: 'Zayii', diger: 'Diğer',
  extra1: 'Ekstra 1', extra2: 'Ekstra 2', extra3: 'Ekstra 3',
  extra4: 'Ekstra 4', extra5: 'Ekstra 5',
}
const ALL_COLUMNS = Object.keys(COL_LABELS)
const PAGE_SIZE = 100

export default function CostReportPage() {
  const [filters, setFilters] = useState({ start: '', end: '', ambar: [], urun: [] })
  const [selectedCols, setSelectedCols] = useState(ALL_COLUMNS)
  const [viewType, setViewType]     = useState('detail')
  const [activePeriod, setActivePeriod] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [data, setData]   = useState([])
  const [page, setPage]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    getWarehouses().then(setWarehouses).catch(() => {})
    getReportProducts().then(setAllProducts).catch(() => {})
    applyPeriod('son30')
  }, [])

  const applyPeriod = (value) => {
    const { start, end } = periodToDates(value)
    setFilters(f => ({ ...f, start, end }))
    setActivePeriod(value)
  }

  const toggleCol = (col) =>
    setSelectedCols(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )

  const buildParams = () => ({
    view:    viewType,
    start:   filters.start,
    end:     filters.end,
    ambar:   filters.ambar.join(','),
    urun:    filters.urun.join(','),
    columns: selectedCols.join(','),
  })

  const loadReport = useCallback(async () => {
    if (!filters.start || !filters.end) { setError('Başlangıç ve bitiş tarihi seçin.'); return }
    setLoading(true); setError('')
    try {
      const res = await getCostReport(buildParams())
      setData(res.data || [])
      setPage(0)
    } catch { setError('Veriler yüklenemedi.') }
    finally { setLoading(false) }
  }, [filters, viewType, selectedCols])

  const exportExcel = () => {
    if (!filters.start || !filters.end) { setError('Başlangıç ve bitiş tarihi seçin.'); return }
    window.location.href = getCostReportExcelUrl(buildParams())
  }

  const visibleCols = selectedCols.filter(c => ALL_COLUMNS.includes(c))
  const totalPages = Math.ceil(data.length / PAGE_SIZE)
  const slice = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Envanter Rapor
        </h1>
        <p style={{ color: 'var(--text-tertiary)', marginTop: 4, fontSize: 13.5 }}>
          Envanter verilerini filtreleyin ve dışa aktarın.
        </p>
      </div>

      {/* Filter Panel */}
      <section style={{
        background: 'var(--bg-surface)', padding: '20px 24px', borderRadius: 14,
        border: '1px solid var(--border-medium)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16,
      }}>
        {/* Row 1: Hızlı dönem + görünüm toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Hızlı Dönem Seçimi</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {QUICK_PERIODS.map(p => (
                <button key={p.value} onClick={() => applyPeriod(p.value)} style={{
                  padding: '6px 14px', fontSize: 12.5, fontWeight: 600,
                  background: activePeriod === p.value ? 'var(--primary)' : 'var(--bg-main)',
                  color: activePeriod === p.value ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${activePeriod === p.value ? 'var(--primary)' : 'var(--border-medium)'}`,
                  borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s',
                }}>{p.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Görünüm Türü</label>
            <div style={{ display: 'flex', background: 'var(--bg-main)', padding: 4, borderRadius: 10, gap: 4 }}>
              {[
                { value: 'detail',  label: 'Günlük Detay' },
                { value: 'summary', label: 'Ürün Özeti' },
              ].map(v => (
                <button key={v.value} onClick={() => setViewType(v.value)} style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, cursor: 'pointer',
                  background: viewType === v.value ? 'var(--bg-surface)' : 'transparent',
                  color: viewType === v.value ? 'var(--primary)' : 'var(--text-secondary)',
                  boxShadow: viewType === v.value ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                }}>{v.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Tarih */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Başlangıç Tarihi</label>
            <input type="date" value={filters.start}
              onChange={e => { setActivePeriod(null); setFilters(f => ({ ...f, start: e.target.value })) }}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Bitiş Tarihi</label>
            <input type="date" value={filters.end}
              onChange={e => { setActivePeriod(null); setFilters(f => ({ ...f, end: e.target.value })) }}
              style={inputStyle} />
          </div>
        </div>

        {/* Row 3: Ambar + Ürün */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <MultiSelect label="Ambar" options={warehouses} value={filters.ambar}
            onChange={v => setFilters(f => ({ ...f, ambar: v }))} />
          <MultiSelect label="Ürün" options={allProducts} value={filters.urun}
            onChange={v => setFilters(f => ({ ...f, urun: v }))} />
        </div>

        {/* Row 4: Sütun seçimi */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Sütunlar</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {ALL_COLUMNS.map(col => (
              <label key={col} style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
                fontSize: 12.5, fontWeight: 600,
                background: selectedCols.includes(col) ? 'rgba(37,99,235,0.1)' : 'var(--bg-main)',
                border: `1px solid ${selectedCols.includes(col) ? 'var(--primary)' : 'var(--border-medium)'}`,
                color: selectedCols.includes(col) ? 'var(--primary)' : 'var(--text-secondary)',
              }}>
                <input type="checkbox" checked={selectedCols.includes(col)}
                  onChange={() => toggleCol(col)} style={{ display: 'none' }} />
                {COL_LABELS[col]}
              </label>
            ))}
          </div>
        </div>

        {/* Row 5: Aksiyonlar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={loadReport} disabled={loading}
            className="btn-primary"
            style={{ flex: 2, minWidth: 140, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="bi bi-search" />
            {loading ? 'Sorgulanıyor…' : 'Sorgula'}
          </button>
          <button onClick={exportExcel}
            className="btn-secondary"
            style={{ flex: 1, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <i className="bi bi-file-earmark-excel" />
            Excel
          </button>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 10, padding: '0.75rem 1rem', marginBottom: 16, fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <i className="bi bi-exclamation-triangle-fill" /> {error}
        </div>
      )}

      {/* Results Table */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3rem 0', color: 'var(--text-tertiary)' }}>
          <div style={{ width: 18, height: 18, border: '2px solid var(--border-medium)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Yükleniyor…
        </div>
      ) : data.length > 0 ? (
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 14,
          border: '1px solid var(--border-medium)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-medium)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            {data.length.toLocaleString('tr-TR')} kayıt
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.855rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-medium)' }}>
                  <th style={thS('left')}>Ürün</th>
                  <th style={thS()}>Ambar</th>
                  {viewType === 'detail' && <th style={thS()}>Tarih</th>}
                  {viewType === 'detail' && <th style={thS()}>Mevcut</th>}
                  {visibleCols.map(c => (
                    <th key={c} style={thS()}>{COL_LABELS[c]}</th>
                  ))}
                  {viewType === 'detail'
                    ? <th style={{ ...thS(), color: 'var(--text-primary)' }}>Kalan</th>
                    : <th style={{ ...thS(), color: 'var(--text-primary)' }}>Son Kalan</th>
                  }
                </tr>
              </thead>
              <tbody>
                {slice.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.5rem 0.85rem', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {row.product_name}
                    </td>
                    <td style={tdS()}>{row.ambar}</td>
                    {viewType === 'detail' && <td style={tdS()}>{row.entry_date}</td>}
                    {viewType === 'detail' && <td style={tdS()}>{row.mevcut ?? 0}</td>}
                    {visibleCols.map(c => (
                      <td key={c} style={tdS()}>{row[c] ?? 0}</td>
                    ))}
                    <td style={{
                      ...tdS(), fontWeight: 700,
                      color: (viewType === 'detail' ? row.kalan : row.son_kalan) < 0
                        ? '#dc2626' : '#16a34a',
                    }}>
                      {viewType === 'detail' ? row.kalan : row.son_kalan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderTop: '1px solid var(--border-light)', fontSize: 12.5,
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
      ) : data.length === 0 && !loading && filters.start ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          Sonuç bulunamadı.
        </div>
      ) : null}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const thS = (align = 'center') => ({
  padding: '0.55rem 0.75rem', textAlign: align,
  color: 'var(--text-tertiary)', fontWeight: 600,
  fontSize: '0.76rem', whiteSpace: 'nowrap',
})

const tdS = () => ({
  padding: '0.5rem 0.75rem', textAlign: 'center',
  color: 'var(--text-secondary)', fontSize: '0.855rem', whiteSpace: 'nowrap',
})
