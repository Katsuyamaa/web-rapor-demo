import { promptDialog } from '../store/dialogStore'
import { useState, useEffect, useMemo, useCallback, useContext } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { cache } from '../cache'
import MultiSelect from '../components/ui/MultiSelect'
import { DarkModeContext } from '../App'
import {
  Icon, fmt, fmtTL, periodToDates,
  KpiCard, BarList, PeriodTabs, ReportChart,
  computeMetrics, groupByDate, groupByField,
  SegPicker, WarehousePanel, WAREHOUSE_CHART_TYPES, TOP_N_OPTIONS, PALETTE_MIXED, PALETTE_VIBRANT,
  LoadingBadge,
} from '../components/ui/ReportComponents'

function FarkPanel({ data }) {
  const stats = useMemo(() => {
    const withTalep = data.filter(r => parseFloat(r.talep_edilen_miktar || 0) > 0)
    if (withTalep.length === 0) return null
    const eksikRows = withTalep.filter(r => parseFloat(r.miktar || 0) < parseFloat(r.talep_edilen_miktar || 0))
    const fazlaRows = withTalep.filter(r => parseFloat(r.miktar || 0) > parseFloat(r.talep_edilen_miktar || 0))
    const tamCount  = withTalep.length - eksikRows.length - fazlaRows.length

    const stokMap = {}
    eksikRows.forEach(r => {
      const k = r.stok_adi || 'Belirtilmemiş'
      if (!stokMap[k]) stokMap[k] = 0
      stokMap[k] += parseFloat(r.talep_edilen_miktar || 0) - parseFloat(r.miktar || 0)
    })
    const topEksik = Object.entries(stokMap).sort(([,a],[,b]) => b - a).slice(0, 5)
    const maxFark  = topEksik[0]?.[1] || 1

    return { eksik: eksikRows.length, fazla: fazlaRows.length, tam: tamCount, total: withTalep.length, topEksik, maxFark }
  }, [data])

  if (!stats) return null

  const statBoxes = [
    { label: 'Eksik',  count: stats.eksik,  bg: 'rgba(220,38,38,0.1)',   color: '#dc2626', border: 'rgba(220,38,38,0.2)' },
    { label: 'Fazla',  count: stats.fazla,  bg: 'rgba(234,179,8,0.1)',   color: '#b45309', border: 'rgba(234,179,8,0.2)' },
    { label: 'Tam',    count: stats.tam,    bg: 'rgba(22,163,74,0.1)',   color: '#16a34a', border: 'rgba(22,163,74,0.2)' },
  ]

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)' }}>Fark Analizi</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>Talep edilen — gerçekleşen · {stats.total} kayıt</div>
        </div>
        <Link to="/gelistirme/fark-analizi" style={{ fontSize: 12, color: 'var(--primary, #2563eb)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Tümünü gör <i className="bi bi-arrow-right" style={{ fontSize: 11 }} />
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {statBoxes.map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 80, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 750, color: s.color, lineHeight: 1 }}>{s.count}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginTop: 3, opacity: 0.85 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {stats.topEksik.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            En Fazla Eksik Giden Stoklar
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.topEksik.map(([stok, fark]) => (
              <div key={stok} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stok}</div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--border-light)', marginTop: 3 }}>
                    <div style={{ height: '100%', borderRadius: 2, background: '#dc2626', width: `${Math.min(100, (fark / stats.maxFark) * 100)}%`, transition: 'width 400ms' }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', flexShrink: 0 }}>−{fmt(fark)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PERIODS = [
  { value: 'bugun',      label: 'Bugün' },
  { value: 'dun',        label: 'Dün' },
  { value: 'hafta',      label: 'Bu Hafta' },
  { value: 'gecenHafta', label: 'Geçen Hafta' },
  { value: 'ay',         label: 'Bu Ay' },
  { value: 'gecenAy',    label: 'Geçen Ay' },
  { value: 'son30',      label: 'Son 30 Gün' },
  { value: 'yil',        label: 'Bu Yıl' },
  { value: 'ozel',       label: 'Özel' },
]

const MAIN_CHART_TYPES = [
  { value: 'area', label: 'Alan' },
  { value: 'line', label: 'Çizgi' },
  { value: 'bar',  label: 'Sütun' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LiveReportPage() {
  const [period, setPeriod] = useState('bugun')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [chartType, setChartType] = useState('bar')
  const [cikisChartType, setCikisChartType] = useState('donut')
  const [girisChartType, setGirisChartType] = useState('bar')
  const [stokChartType, setStokChartType] = useState('bar')
  const [topNCikis, setTopNCikis] = useState(8)
  const [topNGiris, setTopNGiris] = useState(8)
  const [topNStok, setTopNStok] = useState(8)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [filterCikis, setFilterCikis] = useState([])
  const [filterGiris, setFilterGiris] = useState([])
  const [options, setOptions] = useState({ cikis_ambari: [], giris_ambari: [], stok_adi: [] })
  const [showFilters, setShowFilters] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const FKEY = 'filter-options'
    if (cache.has(FKEY)) { setOptions(cache.get(FKEY)); return }
    client.get('/filters').then(r => { setOptions(r.data); cache.set(FKEY, r.data) }).catch(() => {})
  }, [])

  const effectiveDates = useMemo(() => {
    if (period === 'ozel') return { start: customStart, end: customEnd }
    return periodToDates(period)
  }, [period, customStart, customEnd])

  const load = useCallback(async () => {
    if (!effectiveDates.start || !effectiveDates.end) return
    const cacheKey = `live|${effectiveDates.start}|${effectiveDates.end}|${filterCikis.join(',')}|${filterGiris.join(',')}`
    if (cache.has(cacheKey)) { setData(cache.get(cacheKey)); return }
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({
        start: effectiveDates.start, end: effectiveDates.end,
        cikis: filterCikis.join(','), giris: filterGiris.join(','), stok: '',
      })
      const res = await client.get('/transfers?' + params)
      const rows = res.data.data || []
      setData(rows)
      cache.set(cacheKey, rows)
      setLastUpdated(new Date())
    } catch {
      setError('Veriler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [effectiveDates, filterCikis, filterGiris])

  useEffect(() => { load() }, [load])

  const metrics     = useMemo(() => computeMetrics(data), [data])
  const byDate      = useMemo(() => groupByDate(data), [data])
  const topCikis    = useMemo(() => groupByField(data, 'cikis_ambari', 'toplam', topNCikis), [data, topNCikis])
  const topGiris    = useMemo(() => groupByField(data, 'giris_ambari', 'toplam', topNGiris), [data, topNGiris])
  const topStok     = useMemo(() => groupByField(data, 'stok_adi', 'toplam', topNStok), [data, topNStok])
  const sparkSeries = useMemo(() => byDate.slice(-20).map(([, v]) => v.toplam), [byDate])

  const saveReport = async () => {
    const name = await promptDialog('Bu rapor görünümü için bir ad girin:')
    if (!name) return
    setSaving(true)
    try {
      await client.post('/filters/saved', {
        name,
        filter_type: 'live_report',
        cikis_ambari: filterCikis.join(','),
        giris_ambari: filterGiris.join(','),
        stok_adi: '',
        date_filter: period,
        start_date: effectiveDates.start,
        end_date: effectiveDates.end,
      })
      window.alert(`"${name}" kaydedildi. Anasayfada görünecek.`)
    } catch (e) {
      const errorMsg = e.response?.data?.error || 'Kaydedilemedi.';
      window.alert(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const exportExcel = () => {
    const p = new URLSearchParams({
      start: effectiveDates.start, end: effectiveDates.end,
      cikis: filterCikis.join(','), giris: filterGiris.join(','), stok: '',
    })
    window.location.href = '/api/export_excel?' + p
  }

  const periodLabel = PERIODS.find(p => p.value === period)?.label || ''

  return (
    <div className="fade-in" style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 750, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Canlı Rapor
          </h1>
          <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {effectiveDates.start && effectiveDates.end
              ? `${effectiveDates.start} – ${effectiveDates.end} · ${data.length.toLocaleString('tr-TR')} kayıt`
              : 'Dönem seçin'}
            {lastUpdated && (
              <span style={{ marginLeft: 8, opacity: 0.7 }}>
                · {lastUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} güncellendi
              </span>
            )}
          </div>
        </div>
        <div className="page-actions">
          <button onClick={load} disabled={loading} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="refresh" size={13} /> <span className="btn-label">{loading ? 'Yükleniyor…' : 'Yenile'}</span>
          </button>
          <button onClick={() => setShowFilters(v => !v)} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="filter" size={13} />
            <span className="btn-label">Filtrele</span>
            {(filterCikis.length + filterGiris.length) > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--primary)', color: 'white', padding: '1px 6px', borderRadius: 8 }}>
                {filterCikis.length + filterGiris.length}
              </span>
            )}
          </button>
          <button onClick={exportExcel} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="download" size={13} /> <span className="btn-label">Excel</span>
          </button>
          <button onClick={saveReport} disabled={saving} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="save" size={13} color="white" /> <span className="btn-label">{saving ? 'Kaydediliyor…' : 'Kaydet'}</span>
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <PeriodTabs value={period} onChange={p => setPeriod(p)} options={PERIODS} />
        {period === 'ozel' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding: '5px 10px', border: '1.5px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>–</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding: '5px 10px', border: '1.5px solid var(--border-medium)', borderRadius: 8, fontSize: 13, background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none' }} />
          </div>
        )}
      </div>

      {/* Ambar filtreleri (collapsible) */}
      {showFilters && (
        <div className="grid-2col" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
          <MultiSelect label="Çıkış Ambarı" options={options.cikis_ambari} value={filterCikis} onChange={setFilterCikis} />
          <MultiSelect label="Giriş Ambarı" options={options.giris_ambari} value={filterGiris} onChange={setFilterGiris} />
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--error, #dc2626)', padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* KPI Cards + Charts with loading overlay */}
      <div style={{ position: 'relative' }}>
        <LoadingBadge show={loading} />

      {/* KPI Cards */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <KpiCard label="Toplam Tutar" value={fmtTL(metrics.total)} series={sparkSeries} accentColor="#2563eb" />
        <KpiCard label="Sipariş Sayısı" value={fmt(metrics.orders)} series={byDate.slice(-20).map(([, v]) => v.count)} accentColor="#059669" />
        <KpiCard label="Günlük Ort. Tutar" value={fmtTL(metrics.dailyAvg)} sub="günlük ortalama" accentColor="#d97706" />
        <KpiCard label="Ort. Sipariş Tutarı" value={fmtTL(metrics.avgOrder)} sub="sipariş başına" accentColor="#7c3aed" />
      </div>

      {/* Main Chart */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: 12, padding: '16px 20px 12px', marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)' }}>Günlük Tutar Grafiği</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{periodLabel} · tarih bazlı toplam</div>
          </div>
          <SegPicker value={chartType} onChange={setChartType} options={MAIN_CHART_TYPES} />
        </div>
        {byDate.length > 0
          ? <ReportChart byDate={byDate} chartType={chartType} height={240} />
          : (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              {loading ? 'Yükleniyor…' : 'Grafik için veri bulunamadı'}
            </div>
          )
        }
      </div>

      {/* Warehouse panels */}
      <div className="grid-2col" style={{ marginBottom: 12 }}>
        <WarehousePanel
          title="Çıkış Ambarı Dağılımı"
          items={topCikis}
          accentColor="#2563eb"
          palette={PALETTE_MIXED}
          topN={topNCikis}
          onTopNChange={setTopNCikis}
          chartType={cikisChartType}
          onChartTypeChange={setCikisChartType}
        />
        <WarehousePanel
          title="Giriş Ambarı Dağılımı"
          items={topGiris}
          accentColor="#7c3aed"
          palette={PALETTE_VIBRANT}
          topN={topNGiris}
          onTopNChange={setTopNGiris}
          chartType={girisChartType}
          onChartTypeChange={setGirisChartType}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <WarehousePanel
          title="Stok Adı Dağılımı"
          items={topStok}
          accentColor="#10b981"
          palette={PALETTE_MIXED}
          topN={topNStok}
          onTopNChange={setTopNStok}
          chartType={stokChartType}
          onChartTypeChange={setStokChartType}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <FarkPanel data={data} />
      </div>

      </div>{/* end loading wrapper */}
    </div>
  )
}
