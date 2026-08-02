import { confirmDialog } from '../store/dialogStore'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import usePageStore from '../store/pageStore'
import useWidgetStore from '../store/widgetStore'
import GridLayout from '../components/dashboard/GridLayout'
import ErrorBoundary from '../components/ui/ErrorBoundary'
import client from '../api/client'
import { cache } from '../cache'
import {
  fmt, fmtTL, periodToDates,
  KpiCard, ReportChart,
  computeMetrics, groupByDate, groupByField,
  WarehousePanel, PALETTE_BLUE, PALETTE_PURPLE, WAREHOUSE_CHART_TYPES, TOP_N_OPTIONS,
} from '../components/ui/ReportComponents'
import 'gridstack/dist/gridstack.min.css'

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const handler = () => setW(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return w
}

// ─── Mini Icon ────────────────────────────────────────────────────────────────
function Ic({ name, size = 14, color = 'currentColor' }) {
  const p = {
    plus:    <path d="M12 5v14M5 12h14" />,
    edit:    <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
    check:   <path d="M4 12l5 5L20 6" />,
    trash:   <><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></>,
    refresh: <><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" /></>,
    report:  <><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    star:    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {p[name] || null}
    </svg>
  )
}

// ─── Saved Report Card ────────────────────────────────────────────────────────
function SavedReportCard({ report, isActive, onClick, onDelete }) {
  const label = report.date_filter === 'bugun' ? 'Bugün'
    : report.date_filter === 'hafta' ? 'Bu Hafta'
    : report.date_filter === 'ay'    ? 'Bu Ay'
    : report.date_filter === 'son30' ? 'Son 30 Gün'
    : report.date_filter === 'yil'   ? 'Bu Yıl'
    : `${String(report.start_date || '').slice(0, 10)} – ${String(report.end_date || '').slice(0, 10)}`

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        border: isActive ? '2px solid var(--primary)' : '1px solid var(--border-medium)',
        background: isActive ? 'rgba(37,99,235,0.06)' : 'var(--bg-surface)',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'all 0.15s', boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
        minWidth: 0,
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: isActive ? 'var(--primary)' : 'var(--bg-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ic name="report" size={15} color={isActive ? 'white' : 'var(--text-tertiary)'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{label}</div>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(report.id) }}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, opacity: 0.6, lineHeight: 1 }}
      >×</button>
    </div>
  )
}

// ─── Report Summary Section ───────────────────────────────────────────────────
function ReportSummary({ report }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [topNCikis, setTopNCikis] = useState(5)
  const [topNGiris, setTopNGiris]  = useState(5)
  const [chartTypeCikis, setChartTypeCikis] = useState('bar')
  const [chartTypeGiris, setChartTypeGiris] = useState('bar')
  const windowWidth = useWindowWidth()

  const dates = useMemo(() => {
    if (report.date_filter && report.date_filter !== 'custom') {
      return periodToDates(report.date_filter)
    }
    return {
      start: String(report.start_date || '').slice(0, 10),
      end:   String(report.end_date   || '').slice(0, 10),
    }
  }, [report])

  useEffect(() => {
    if (!dates.start || !dates.end) return
    const cacheKey = `report|${report.id}|${dates.start}|${dates.end}|${report.cikis_ambari || ''}|${report.giris_ambari || ''}`
    if (cache.has(cacheKey)) { setData(cache.get(cacheKey)); setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams({
      start: dates.start, end: dates.end,
      cikis: report.cikis_ambari || '',
      giris: report.giris_ambari || '',
      stok: '',
    })
    client.get('/transfers?' + params)
      .then(r => { const rows = r.data.data || []; setData(rows); cache.set(cacheKey, rows) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [report])

  const metrics   = useMemo(() => computeMetrics(data), [data])
  const byDate    = useMemo(() => groupByDate(data), [data])
  const sparkSeries = useMemo(() => byDate.slice(-20).map(([, v]) => v.toplam), [byDate])
  const topCikis  = useMemo(() => groupByField(data, 'cikis_ambari', 'toplam', topNCikis), [data, topNCikis])
  const topGiris  = useMemo(() => groupByField(data, 'giris_ambari', 'toplam', topNGiris), [data, topNGiris])

  const chartHeight = windowWidth <= 768 ? 130 : 180

  if (loading) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
      Yükleniyor…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="grid-kpi" style={{ gap: 10 }}>
        <KpiCard label="Toplam Tutar"  value={fmtTL(metrics.total)}   series={sparkSeries}                                   accentColor="#2563eb" />
        <KpiCard label="Kayıt Sayısı"  value={fmt(metrics.rows)}      series={byDate.slice(-20).map(([,v]) => v.count)}      accentColor="#059669" />
        <KpiCard label="Toplam Miktar" value={fmt(metrics.miktar)}    sub="birim"                                             accentColor="#d97706" />
        <KpiCard label="Ambar Sayısı"  value={metrics.warehouses}     sub="çıkış ambarı"                                     accentColor="#7c3aed" />
      </div>

      {byDate.length > 0 ? (
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
          borderRadius: 12, padding: '14px 18px 8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)' }}>Günlük Tutar</div>
            <Link to="/canli-rapor" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Detaylı →</Link>
          </div>
          <ReportChart byDate={byDate} chartType="area" height={chartHeight} />
        </div>
      ) : (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, background: 'var(--bg-surface)', borderRadius: 12, border: '1px dashed var(--border-medium)' }}>
          Bu dönemde transfer verisi bulunamadı.
        </div>
      )}

      {data.length > 0 && (
        <div className="grid-2col">
          <WarehousePanel
            title="Çıkış Ambarı Dağılımı"
            items={topCikis}
            accentColor="#2563eb"
            palette={PALETTE_BLUE}
            topN={topNCikis}
            onTopNChange={setTopNCikis}
            chartType={chartTypeCikis}
            onChartTypeChange={setChartTypeCikis}
          />
          <WarehousePanel
            title="Giriş Ambarı Dağılımı"
            items={topGiris}
            accentColor="#7c3aed"
            palette={PALETTE_PURPLE}
            topN={topNGiris}
            onTopNChange={setTopNGiris}
            chartType={chartTypeGiris}
            onChartTypeChange={setChartTypeGiris}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main HomePage ────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { tree } = usePageStore()
  const { widgetsByPage, fetchWidgets, removeWidget } = useWidgetStore()

  const homePage = tree.find(p => p.slug === 'home')
  const widgets  = widgetsByPage[homePage?.id] || []
  const [editMode, setEditMode] = useState(false)

  // Saved reports
  const [savedReports, setSavedReports] = useState([])
  const [activeReportId, setActiveReportId] = useState(null)

  // Sync active report from URL param (?report=id)
  useEffect(() => {
    const paramId = searchParams.get('report')
    if (paramId) setActiveReportId(Number(paramId))
  }, [searchParams])

  const loadSavedReports = useCallback(() => {
    client.get('/filters/saved?type=live_report')
      .then(r => {
        const reports = r.data.data || []
        setSavedReports(reports)
        if (reports.length > 0 && !searchParams.get('report')) {
          setActiveReportId(reports[0].id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (homePage?.id) fetchWidgets(homePage.id)
  }, [homePage?.id, fetchWidgets])

  useEffect(() => { loadSavedReports() }, [loadSavedReports])

  async function handleDeleteWidget(widgetId) {
    if (!homePage?.id) return
    await removeWidget(homePage.id, widgetId)
  }

  const deleteReport = async (id) => {
    if (!await confirmDialog('Bu raporu silmek istiyor musunuz?')) return
    try {
      await client.delete(`/filters/saved/${id}`)
      setSavedReports(r => r.filter(x => x.id !== id))
      if (activeReportId === id) {
        const remaining = savedReports.filter(x => x.id !== id)
        setActiveReportId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch {}
  }

  const activeReport = savedReports.find(r => r.id === activeReportId)

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Anasayfa</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Örnek Gıda A.Ş. rapor sistemine hoş geldiniz.</p>
        </div>
        {widgets.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {editMode ? (
              <>
                <button className="pressable" onClick={() => navigate('/dashboard/ekle?page=home')}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600 }}>
                  <i className="bi bi-plus-lg"></i> Widget Ekle
                </button>
                <button className="pressable" onClick={() => setEditMode(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', fontWeight: 600 }}>
                  <i className="bi bi-check-lg"></i> Bitti
                </button>
              </>
            ) : (
              <button className="pressable" onClick={() => setEditMode(true)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', fontWeight: 600 }}>
                <i className="bi bi-pencil-square"></i> Düzenle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Widgets */}
      {widgets.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <ErrorBoundary>
            <GridLayout
              pageId={homePage?.id}
              widgets={widgets.filter(w => !w.parent_widget_id)}
              isEditable={editMode}
              onDelete={handleDeleteWidget}
              onEdit={(widget) => navigate(`/dashboard/ekle?page=home&edit=${widget.id}`)}
            />
          </ErrorBoundary>
        </section>
      )}

      {/* ─── Kayıtlı Transfer Raporları ─────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
          <h2 style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Kayıtlı Transfer Raporları
          </h2>
          <Link to="/canli-rapor" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', fontSize: 12, fontWeight: 600,
            background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
            borderRadius: 6, color: 'var(--text-secondary)', textDecoration: 'none',
          }}>
            <Ic name="plus" size={12} /> Yeni Rapor Kaydet
          </Link>
        </div>

        {savedReports.length === 0 ? (
          <div style={{
            padding: '3rem 2rem', textAlign: 'center',
            border: '2px dashed var(--border-medium)', borderRadius: 14,
            background: 'var(--bg-surface)', color: 'var(--text-tertiary)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.4 }}><i className="bi bi-bar-chart-fill"></i></div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Henüz kayıtlı rapor yok</div>
            <div style={{ fontSize: 13, marginBottom: 16 }}>
              Canlı Rapor sayfasında dönem ve filtre seçip "Anasayfaya Kaydet" yapın.
            </div>
            <Link to="/canli-rapor" className="btn-primary" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              textDecoration: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            }}>
              <Ic name="report" size={13} color="white" /> Canlı Rapora Git
            </Link>
          </div>
        ) : (
          <div className="grid-report">
            {/* Report selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {savedReports.map(r => (
                <SavedReportCard
                  key={r.id}
                  report={r}
                  isActive={r.id === activeReportId}
                  onClick={() => setActiveReportId(r.id)}
                  onDelete={deleteReport}
                />
              ))}
            </div>

            {/* Active report charts */}
            <div>
              {activeReport ? (
                <ReportSummary key={activeReport.id} report={activeReport} />
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  Sol taraftan bir rapor seçin.
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
