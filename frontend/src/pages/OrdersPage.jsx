import { useState, useEffect, useCallback } from 'react'
import client from '../api/client'
import MultiSelect from '../components/ui/MultiSelect'
import { Icon, periodToDates } from '../components/ui/ReportComponents'
import DistributionTab from '../components/orders/DistributionTab'

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block',
}

const QUICK_PERIODS = [
  { label: 'Bugün',      value: 'bugun' },
  { label: 'Dün',        value: 'dun' },
  { label: 'Bu Hafta',   value: 'hafta' },
  { label: 'Bu Ay',      value: 'ay' },
  { label: 'Son 30 Gün', value: 'son30' },
]

export default function OrdersPage() {
  const [tab, setTab] = useState('webreports') // 'webreports' | 'transfer' | 'distribution'
  const [filters, setFilters] = useState({ start: '', end: '', warehouse: [], branch: [], stok: [] })
  const [options, setOptions] = useState({ warehouses: [], branches: [], stoks: [] })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activePeriod, setActivePeriod] = useState('bugun')
  const [error, setError] = useState('')

  const loadOptions = useCallback(() => {
    const url = tab === 'webreports' ? '/orders/filters' : '/transfer-orders/filters'
    client.get(url).then(r => {
      if (tab === 'webreports') {
        setOptions({ warehouses: r.data.warehouses, branches: r.data.branches, stoks: [] })
      } else {
        setOptions({ warehouses: [], branches: r.data.branches, stoks: r.data.stoks })
      }
    }).catch(() => {})
  }, [tab])

  useEffect(() => {
    loadOptions()
    applyPeriod('bugun')
    setData([])
    setError('')
  }, [tab, loadOptions])

  const applyPeriod = (value) => {
    const { start, end } = periodToDates(value)
    setFilters(f => ({ ...f, start, end }))
    setActivePeriod(value)
  }

  const loadData = async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({
        start: filters.start, end: filters.end,
      })
      if (tab === 'webreports') {
        if (filters.warehouse.length) params.append('warehouse', filters.warehouse.join(','))
        if (filters.branch.length) params.append('branch', filters.branch.join(','))
        const res = await client.get('/orders?' + params)
        setData(res.data.data || [])
      } else {
        if (filters.branch.length) params.append('branch', filters.branch.join(','))
        if (filters.stok.length) params.append('stok', filters.stok.join(','))
        const res = await client.get('/transfer-orders?' + params)
        setData(res.data.data || [])
      }
    } catch { setError('Veriler yüklenemedi.') }
    finally { setLoading(false) }
  }

  const handleFetchAuto = async () => {
    if (tab !== 'webreports') return
    if (!filters.start || !filters.end) { alert('Lütfen tarih aralığı seçin'); return }
    setFetching(true); setError('')
    try {
      const res = await client.post('/orders/fetch', { start: filters.start, end: filters.end })
      if (res.data.success) {
        alert(`Başarılı: ${res.data.count} satır çekildi.`)
        loadData()
        loadOptions()
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Otomatik çekim hatası')
    } finally { setFetching(false) }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('date', filters.start || new Date().toISOString().split('T')[0])
    
    setUploading(true); setError('')
    const url = tab === 'webreports' ? '/orders/upload' : '/transfer-orders/upload'
    try {
      const res = await client.post(url, formData, { headers: { 'Content-Type': undefined } })
      if (res.data.success) {
        alert(`Başarılı: ${res.data.count} satır yüklendi.`)
        loadData()
        loadOptions()
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Dosya yükleme hatası')
    } finally { 
      setUploading(false)
      e.target.value = '' // reset input
    }
  }

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Sipariş Listeleri
          </h1>
          <p style={{ color: 'var(--text-tertiary)', marginTop: 4, fontSize: 14 }}>
            {tab === 'webreports' ? 'WebReports üzerinden otomatik çekin veya Excel yükleyin.' : tab === 'transfer' ? 'Transfer taleplerini (Tüm Siparişler Excel) yönetin.' : 'Sipariş verilerinden dağıtım listesi oluşturun.'}
          </p>
        </div>
        {tab !== 'distribution' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <i className="bi bi-file-earmark-excel"></i> {uploading ? 'Yükleniyor...' : 'Excel Yükle'}
              <input type="file" hidden accept=".xls,.xlsx,.xlsm" onChange={handleFileUpload} disabled={uploading} />
            </label>
            {tab === 'webreports' && (
              <button onClick={handleFetchAuto} disabled={fetching} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <i className={`bi ${fetching ? 'bi-hourglass-split' : 'bi-cloud-download'}`}></i>
                {fetching ? 'Çekiliyor...' : 'Siteden Otomatik Çek'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: 4, borderRadius: 12, marginBottom: 20, width: 'fit-content', border: '1px solid var(--border-medium)' }}>
        <button onClick={() => setTab('webreports')} style={{
          padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer',
          background: tab === 'webreports' ? 'var(--primary)' : 'transparent',
          color: tab === 'webreports' ? 'white' : 'var(--text-secondary)',
          transition: 'all 0.2s'
        }}>WebReports Siparişleri</button>
        <button onClick={() => setTab('transfer')} style={{
          padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer',
          background: tab === 'transfer' ? 'var(--primary)' : 'transparent',
          color: tab === 'transfer' ? 'white' : 'var(--text-secondary)',
          transition: 'all 0.2s'
        }}>Transfer Talepleri (Excel)</button>
        <button onClick={() => setTab('distribution')} style={{
          padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 9, cursor: 'pointer',
          background: tab === 'distribution' ? 'var(--primary)' : 'transparent',
          color: tab === 'distribution' ? 'white' : 'var(--text-secondary)',
          transition: 'all 0.2s'
        }}>Dağıtım Listesi Oluştur</button>
      </div>

      {tab === 'distribution' ? (
        <DistributionTab />
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Sidebar Filters */}
        <aside style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 14, border: '1px solid var(--border-medium)', position: 'sticky', top: '1rem' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Hızlı Seçim</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {QUICK_PERIODS.map(p => (
                <button key={p.value} onClick={() => applyPeriod(p.value)} style={{
                  padding: '5px 10px', fontSize: 11.5, fontWeight: 600,
                  background: activePeriod === p.value ? 'var(--primary)' : 'var(--bg-main)',
                  color: activePeriod === p.value ? 'white' : 'var(--text-secondary)',
                  border: 'none', borderRadius: 6, cursor: 'pointer'
                }}>{p.label}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Başlangıç</label>
            <input type="date" value={filters.start} onChange={e => setFilters(f=>({...f, start: e.target.value}))} 
              style={{ width:'100%', padding:'8px', borderRadius:8, border:'1.5px solid var(--border-medium)', background:'var(--bg-main)', color:'var(--text-primary)' }}/>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Bitiş</label>
            <input type="date" value={filters.end} onChange={e => setFilters(f=>({...f, end: e.target.value}))}
              style={{ width:'100%', padding:'8px', borderRadius:8, border:'1.5px solid var(--border-medium)', background:'var(--bg-main)', color:'var(--text-primary)' }}/>
          </div>

          {tab === 'webreports' ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <MultiSelect label="Ambarlar" options={options.warehouses} value={filters.warehouse} onChange={v => setFilters(f=>({...f, warehouse:v}))} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <MultiSelect label="Şubeler" options={options.branches} value={filters.branch} onChange={v => setFilters(f=>({...f, branch:v}))} />
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <MultiSelect label="Şubeler" options={options.branches} value={filters.branch} onChange={v => setFilters(f=>({...f, branch:v}))} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <MultiSelect label="Stoklar" options={options.stoks} value={filters.stok} onChange={v => setFilters(f=>({...f, stok:v}))} />
              </div>
            </>
          )}

          <button onClick={loadData} disabled={loading} className="btn-primary" style={{ width: '100%', padding: '10px' }}>
            {loading ? 'Yükleniyor...' : 'Listele'}
          </button>
        </aside>

        {/* Results Table */}
        <div style={{ background: 'var(--bg-surface)', borderRadius: 14, border: '1px solid var(--border-medium)', minHeight: 400, overflow: 'hidden' }}>
          {error && <div style={{ margin: 20, padding: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 14 }}>{error}</div>}
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 700 }}>TARİH</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 700 }}>{tab === 'webreports' ? 'AMBAR / ŞUBE' : 'ŞUBE (GİRİŞ AMBARI)'}</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 700 }}>STOK ADI</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'right' }}>MİKTAR</th>
                {tab === 'webreports' && <th style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontWeight: 700, textAlign: 'right' }}>TOPLAM</th>}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  {loading ? 'Veriler çekiliyor...' : 'Filtreye uygun sonuç bulunamadı.'}
                </td></tr>
              ) : data.map((row, i) => (
                <tr key={row.id || i} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{row.order_date}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{row.warehouse || row.giris_ambari || '-'}</div>
                    {row.branch && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{row.branch}</div>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{row.stok_adi}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{row.miktar || row.toplam_miktar} {row.birim}</td>
                  {tab === 'webreports' && <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>₺{parseFloat(row.toplam || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
