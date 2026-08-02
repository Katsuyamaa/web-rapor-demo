import { confirmDialog, promptDialog } from '../store/dialogStore'
import { useState, useEffect, useCallback } from 'react'
import client from '../api/client'
import MultiSelect from '../components/ui/MultiSelect'
import { Icon, TransferTable, periodToDates, TimeBreakdownTable, LoadingBadge } from '../components/ui/ReportComponents'

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
  { label: 'Bugün',      value: 'bugun' },
  { label: 'Dün',        value: 'dun' },
  { label: 'Bu Hafta',   value: 'hafta' },
  { label: 'Geçen Hafta',value: 'gecenHafta' },
  { label: 'Bu Ay',      value: 'ay' },
  { label: 'Geçen Ay',   value: 'gecenAy' },
  { label: 'Son 30 Gün', value: 'son30' },
  { label: 'Bu Yıl',     value: 'yil' },
]

export default function ReportsPage() {
  const [filters, setFilters] = useState({ start: '', end: '', cikis: [], giris: [], stok: [] })
  const [options, setOptions] = useState({ cikis_ambari: [], giris_ambari: [], stok_adi: [] })
  const [savedFilters, setSavedFilters] = useState([])
  const [data, setData] = useState([])
  const [analysisData, setAnalysisData] = useState([])
  const [viewType, setViewType] = useState('list') // 'list' | 'analysis' | 'zaman_kirilimi'
  const [groupBy, setGroupBy] = useState('gun') // 'gun' | 'hafta' | 'ay'
  const [timeBreakdownData, setTimeBreakdownData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activePeriod, setActivePeriod] = useState(null)

  const loadSavedFilters = useCallback(() => {
    client.get('/filters/saved?type=report').then(r => setSavedFilters(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    client.get('/filters').then(r => setOptions(r.data)).catch(() => setError('Filtre seçenekleri yüklenemedi.'))
    loadSavedFilters()
    applyPeriod('son30')
  }, [loadSavedFilters])

  const applyPeriod = (value) => {
    const { start, end } = periodToDates(value)
    setFilters(f => ({ ...f, start, end }))
    setActivePeriod(value)
  }

  const applySavedFilter = sf => {
    setActivePeriod(null)
    setFilters({
      start: sf.start_date ? String(sf.start_date).slice(0, 10) : '',
      end:   sf.end_date   ? String(sf.end_date).slice(0, 10)   : '',
      cikis: sf.cikis_ambari ? sf.cikis_ambari.split(',').filter(Boolean) : [],
      giris: sf.giris_ambari ? sf.giris_ambari.split(',').filter(Boolean) : [],
      stok:  sf.stok_adi    ? sf.stok_adi.split(',').filter(Boolean)     : [],
    })
  }

  const saveCurrentFilter = async () => {
    const name = await promptDialog('Kaydedilecek filtrenin adını girin:')
    if (!name) return
    try {
      await client.post('/filters/saved', {
        name, cikis_ambari: filters.cikis.join(','), giris_ambari: filters.giris.join(','),
        stok_adi: filters.stok.join(','), date_filter: 'custom',
        start_date: filters.start, end_date: filters.end,
      })
      loadSavedFilters()
    } catch (e) { 
      const errorMsg = e.response?.data?.error || 'Filtre kaydedilemedi';
      alert(errorMsg);
    }
  }

  const deleteSavedFilter = async (id, e) => {
    e.stopPropagation()
    if (!await confirmDialog('Bu filtreyi silmek istiyor musunuz?')) return
    try { await client.delete(`/filters/saved/${id}`); loadSavedFilters() } catch {}
  }

  const loadReports = async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({
        start: filters.start, end: filters.end,
        cikis: filters.cikis.join(','),
        giris: filters.giris.join(','),
        stok: filters.stok.join(','),
        warehouse: filters.cikis.join(','), // analysis expects 'warehouse'
      })

      if (viewType === 'analysis') {
        const res = await client.get('/warehouse_analysis?' + params)
        setAnalysisData(res.data.warehouses || [])
      } else if (viewType === 'zaman_kirilimi') {
        if (!filters.start || !filters.end) {
          setError('Zaman kırılımı için başlangıç ve bitiş tarihi seçilmelidir.')
          return
        }
        const tbParams = new URLSearchParams({
          start: filters.start, end: filters.end,
          group_by: groupBy,
          cikis: filters.cikis.join(','),
          giris: filters.giris.join(','),
          stok: filters.stok.join(','),
        })
        const res = await client.get('/time_breakdown?' + tbParams)
        setTimeBreakdownData(res.data.data || [])
      } else {
        const res = await client.get('/transfers?' + params)
        setData(res.data.data || [])
      }
    } catch { setError('Veriler yüklenemedi.') }
    finally { setLoading(false) }
  }

  const exportExcel = () => {
    const p = new URLSearchParams({
      start: filters.start, end: filters.end,
      cikis: filters.cikis.join(','),
      giris: filters.giris.join(','),
      stok: filters.stok.join(','),
      warehouse: filters.cikis.join(','),
    })
    if (viewType === 'zaman_kirilimi') {
      p.set('group_by', groupBy)
      window.location.href = '/api/time_breakdown_excel?' + p
    } else if (viewType === 'analysis') {
      window.location.href = '/api/warehouse_analysis_excel?' + p
    } else {
      window.location.href = '/api/export_excel?' + p
    }
  }

  const openPreview = () => {
    const p = new URLSearchParams({
      start: filters.start, end: filters.end, 
      cikis: filters.cikis.join(','),
      giris: filters.giris.join(','), 
      stok: filters.stok.join(','),
      warehouse: filters.cikis.join(','),
    })
    const url = viewType === 'analysis' ? '/preview_analysis?' : '/preview?'
    window.open(url + p, '_blank')
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Rapor Filtreleme</h1>
        <p style={{ color: 'var(--text-tertiary)', marginTop: 4, fontSize: 13.5 }}>Transfer verilerini detaylı filtreleyin ve dışa aktarın.</p>
      </div>

      {/* Filter Panel */}
      <section style={{ background: 'var(--bg-surface)', padding: '20px 24px', borderRadius: 14, border: '1px solid var(--border-medium)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 16 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          {/* Quick period buttons */}
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

          {/* View Toggle */}
          <div>
            <label style={labelStyle}>Görünüm Türü</label>
            <div style={{ display: 'flex', background: 'var(--bg-main)', padding: 4, borderRadius: 10, gap: 4 }}>
               <button onClick={() => setViewType('list')} style={{
                 padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, cursor: 'pointer',
                 background: viewType === 'list' ? 'var(--bg-surface)' : 'transparent',
                 color: viewType === 'list' ? 'var(--primary)' : 'var(--text-secondary)',
                 boxShadow: viewType === 'list' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
               }}>Düz Liste</button>
               <button onClick={() => setViewType('analysis')} style={{
                 padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, cursor: 'pointer',
                 background: viewType === 'analysis' ? 'var(--bg-surface)' : 'transparent',
                 color: viewType === 'analysis' ? 'var(--primary)' : 'var(--text-secondary)',
                 boxShadow: viewType === 'analysis' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
               }}>Ambar Bazlı Özet</button>
               <button onClick={() => setViewType('zaman_kirilimi')} style={{
                 padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 7, cursor: 'pointer',
                 background: viewType === 'zaman_kirilimi' ? 'var(--bg-surface)' : 'transparent',
                 color: viewType === 'zaman_kirilimi' ? 'var(--primary)' : 'var(--text-secondary)',
                 boxShadow: viewType === 'zaman_kirilimi' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
               }}>Zaman Kırılımı</button>
            </div>
          </div>
        </div>

        {/* Date inputs */}
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

        {/* Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <MultiSelect label="Çıkış Ambarı" options={options.cikis_ambari} value={filters.cikis} onChange={v => setFilters(f => ({ ...f, cikis: v }))} />
          <MultiSelect label="Giriş Ambarı" options={options.giris_ambari} value={filters.giris} onChange={v => setFilters(f => ({ ...f, giris: v }))} />
          <MultiSelect label="Stok Adı" options={options.stok_adi} value={filters.stok} onChange={v => setFilters(f => ({ ...f, stok: v }))} />
        </div>

        {/* Time groupby toggle — only shown when viewType is zaman_kirilimi */}
        {viewType === 'zaman_kirilimi' && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Zaman Kırılımı:
            </span>
            {[
              { value: 'gun',   label: 'Gün' },
              { value: 'hafta', label: 'Hafta' },
              { value: 'ay',    label: 'Ay' },
            ].map(g => (
              <button key={g.value} onClick={() => setGroupBy(g.value)} style={{
                padding: '5px 14px', fontSize: 12, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
                border: `1.5px solid ${groupBy === g.value ? 'var(--primary)' : 'var(--border-medium)'}`,
                background: groupBy === g.value ? 'var(--primary)' : 'var(--bg-main)',
                color: groupBy === g.value ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}>{g.label}</button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={loadReports} disabled={loading} className="btn-primary"
            style={{ flex: 2, minWidth: 140, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="search" size={13} color="white" /> {loading ? 'Sorgulanıyor…' : 'Sorgula'}
          </button>
          <button onClick={saveCurrentFilter} className="btn-secondary"
            style={{ flex: 1, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="save" size={13} /> Kaydet
          </button>
          <button onClick={exportExcel} className="btn-secondary"
            style={{ flex: 1, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="download" size={13} /> Excel
          </button>
          <button onClick={openPreview} className="btn-secondary"
            style={{ flex: 1, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="print" size={13} /> Önizleme
          </button>
        </div>
      </section>

      {/* Saved filters */}
      {savedFilters.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Kayıtlı Filtreler</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {savedFilters.map(sf => (
              <div key={sf.id} onClick={() => applySavedFilter(sf)} className="pressable" style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'var(--bg-surface)', border: '1px solid var(--primary)',
                borderRadius: 20, padding: '5px 12px', fontSize: 12.5,
                color: 'var(--primary)', cursor: 'pointer', fontWeight: 600, gap: 6,
              }}>
                <Icon name="save" size={12} color="var(--primary)" />
                {sf.name}
                {sf.start_date && (
                  <span style={{ fontSize: 10.5, opacity: 0.7 }}>
                    {String(sf.start_date).slice(0, 10)} – {String(sf.end_date).slice(0, 10)}
                  </span>
                )}
                <button onClick={e => deleteSavedFilter(sf.id, e)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--error, #dc2626)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <div style={{ color: 'var(--error, #dc2626)', padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Table / Analysis / Time Breakdown Results */}
      <div style={{ position: 'relative', minHeight: loading ? 120 : 0 }}>
        <LoadingBadge show={loading} />
      {viewType === 'zaman_kirilimi' ? (
        <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-medium)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <TimeBreakdownTable data={timeBreakdownData} groupBy={groupBy} />
        </div>
      ) : viewType === 'list' ? (
        <>
          {data.length > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              {data.length.toLocaleString('tr-TR')} kayıt
              {filters.start && filters.end ? ` · ${filters.start} – ${filters.end}` : ''}
            </div>
          )}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-medium)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <TransferTable data={data} loading={loading} />
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {analysisData.map((wh, idx) => (
            <div key={idx} style={{ background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-medium)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '12px 20px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{wh.warehouse}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                  <span>Çeşit: <b>{wh.summary.urun_cesidi}</b></span>
                  <span>Miktar: <b>{wh.summary.toplam_miktar.toLocaleString('tr-TR')}</b></span>
                  <span>Tutar: <b>₺{wh.summary.toplam_tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</b></span>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)' }}>
                      <th style={{ padding: '8px 15px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: 10.5, borderBottom: '1px solid var(--border-medium)' }}>STOK ADI</th>
                      <th style={{ padding: '8px 15px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: 10.5, borderBottom: '1px solid var(--border-medium)' }}>MİKTAR</th>
                      <th style={{ padding: '8px 15px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: 10.5, borderBottom: '1px solid var(--border-medium)' }}>ORT. FİYAT</th>
                      <th style={{ padding: '8px 15px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: 10.5, borderBottom: '1px solid var(--border-medium)' }}>TOPLAM TUTAR</th>
                      <th style={{ padding: '8px 15px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: 10.5, borderBottom: '1px solid var(--border-medium)' }}>İŞLEM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wh.data.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px 15px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.stok_adi}</td>
                        <td style={{ padding: '8px 15px', textAlign: 'right' }}>{item.toplam_miktar.toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px 15px', textAlign: 'right' }}>₺{item.ortalama_fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '8px 15px', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>₺{item.toplam_tutar.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '8px 15px', textAlign: 'right', color: 'var(--text-tertiary)' }}>{item.islem_sayisi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {analysisData.length === 0 && !loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>Sorgula butonuna basarak analiz sonuçlarını görebilirsiniz.</div>}
        </div>
      )}
      </div>{/* end loading wrapper */}
    </div>
  )
}
