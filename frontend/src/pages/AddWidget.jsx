import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Chart from 'react-apexcharts'
import usePageStore from '../store/pageStore'
import useWidgetStore from '../store/widgetStore'
import { previewWidget, getWidget, updateWidget } from '../api/widgets'
import client from '../api/client'
import { cache } from '../cache'

/* ── Sabitler ── */
const CHART_TYPES = [
  { value: 'bar',           label: 'Dikey Çubuk',  icon: <i className="bi bi-bar-chart-fill"></i> },
  { value: 'horizontalBar', label: 'Yatay Çubuk',  icon: <i className="bi bi-graph-down"></i> },
  { value: 'line',          label: 'Çizgi',        icon: <i className="bi bi-graph-up"></i> },
  { value: 'area',          label: 'Alan',         icon: <i className="bi bi-triangle-fill"></i> },
  { value: 'pie',           label: 'Pasta',        icon: <i className="bi bi-pie-chart-fill"></i> },
  { value: 'donut',         label: 'Halka',        icon: <i className="bi bi-circle"></i> },
  { value: 'radar',         label: 'Radar',        icon: <i className="bi bi-bezier2"></i> },
  { value: 'radialBar',     label: 'Radyal',       icon: <i className="bi bi-record-circle"></i> },
  { value: 'heatmap',       label: 'Isı Haritası', icon: <i className="bi bi-fire"></i> },
  { value: 'treemap',       label: 'Ağaç Harit.',  icon: <i className="bi bi-map"></i> },
]

const METRICS = [
  { value: 'sum_toplam', label: <><i className="bi bi-currency-dollar"></i> Toplam Tutar (₺)</> },
  { value: 'sum_miktar', label: <><i className="bi bi-box-seam"></i> Toplam Miktar</> },
  { value: 'count_docs', label: <><i className="bi bi-file-earmark-text"></i> Evrak Sayısı</> },
]

const GROUP_BY = [
  { value: 'stok_adi',     label: 'Stok Adı' },
  { value: 'cikis_ambari', label: 'Çıkış Ambarı' },
  { value: 'giris_ambari', label: 'Giriş Ambarı' },
  { value: 'gun',          label: 'Günlük' },
  { value: 'ay',           label: 'Aylık' },
  { value: 'yil',          label: 'Yıllık' },
]

const DATE_FILTERS = [
  { value: 'all',        label: 'Tüm Zamanlar' },
  { value: 'today',      label: 'Bugün' },
  { value: 'last7days',  label: 'Son 7 Gün' },
  { value: 'last30days', label: 'Son 30 Gün' },
  { value: 'thisMonth',  label: 'Bu Ay' },
  { value: 'custom',     label: 'Özel Aralık' },
]

const PALETTES = Array.from({ length: 10 }, (_, i) => `palette${i + 1}`)
const COLORS   = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#84cc16']
const STEPS    = ['Grafik Tipi', 'Veri', 'Görsel Ayarlar', 'Filtreler & Kaydet']
const CIRCULAR = new Set(['pie', 'donut', 'polarArea', 'radialBar'])
const MULTI_SERIES_ALLOWED = new Set(['bar', 'horizontalBar', 'line', 'area'])
const TIME_GROUP_VALUES    = new Set(['gun', 'hafta', 'ay', 'yil'])

/* ── Pill butonu ── */
function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} type="button" style={{
      padding: '0.45rem 0.9rem', borderRadius: '20px', border: 'none', cursor: 'pointer',
      fontSize: '0.8rem', fontWeight: 600, transition: 'all 150ms',
      background: active ? 'var(--primary)' : 'var(--bg-main)',
      color:      active ? '#fff' : 'var(--text-secondary)',
      boxShadow:  active ? 'var(--shadow-primary)' : 'none',
    }}>
      {children}
    </button>
  )
}

/* ── Step progress bar ── */
function StepBar({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
      {STEPS.map((s, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: done ? 'var(--accent)' : active ? 'var(--primary)' : 'var(--border-medium)',
                color: (done || active) ? '#fff' : 'var(--text-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, transition: 'all 200ms',
              }}>
                {done ? <i className="bi bi-check-lg"></i> : i + 1}
              </div>
              <span className="step-label" style={{
                fontSize: '0.62rem', fontWeight: 600, whiteSpace: 'nowrap',
                color: active ? 'var(--primary)' : done ? 'var(--accent)' : 'var(--text-tertiary)',
              }}>
                {s}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 4px', marginBottom: '18px',
                background: done ? 'var(--accent)' : 'var(--border-medium)',
                transition: 'background 300ms',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Mini önizleme grafiği ── */
function MiniPreview({ chartData, chartType, color, palette }) {
  const isMulti = Array.isArray(chartData?.series)

  if (!chartData || (!isMulti && !chartData.labels?.length) || (isMulti && !chartData.series?.length)) return (
    <div style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-tertiary)', fontSize: '0.8rem', textAlign: 'center',
      padding: '1rem', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ fontSize: '2rem', opacity: 0.3 }}><i className="bi bi-bar-chart-fill"></i></div>
      <span>Grafik burada görünecek</span>
    </div>
  )

  const type       = { horizontalBar: 'bar', doughnut: 'donut', stackedBar: 'bar' }[chartType] || chartType
  const isCircular = CIRCULAR.has(type)

  const series = isMulti
    ? chartData.series
    : isCircular
      ? chartData.values
      : [{ name: '', data: chartData.values }]

  const options = {
    chart:       { toolbar: { show: false }, animations: { enabled: false }, background: 'transparent', parentHeightOffset: 0 },
    theme:       { mode: 'light', palette: palette || 'palette1' },
    colors:      isMulti ? undefined : [color || '#2563eb', '#06b6d4'],
    plotOptions: { bar: { horizontal: chartType === 'horizontalBar', borderRadius: 3, columnWidth: '65%' } },
    dataLabels:  { enabled: false },
    xaxis:       { categories: isCircular ? [] : chartData.labels, labels: { style: { fontSize: '9px' } } },
    yaxis:       { show: !isCircular, labels: { style: { fontSize: '9px' } } },
    labels:      isCircular ? chartData.labels : [],
    legend:      { show: isMulti, fontSize: '9px', position: 'bottom' },
    grid:        { borderColor: '#f1f5f9', strokeDashArray: 3 },
    tooltip:     { enabled: false },
  }

  return (
    <Chart key={`${chartType}-${color}-${palette || 'p1'}-${isMulti ? 'm' : 's'}`} options={options} series={series} type={type} width="100%" height="100%" />
  )
}

/* ── Ana bileşen ── */
export default function AddWidget() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const { tree, fetchTree } = usePageStore()
  const { addWidget }  = useWidgetStore()

  const editId = searchParams.get('edit') // widget ID for edit mode

  const [step,    setStep]    = useState(0)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [filterOptions, setFilterOptions] = useState({ cikis_ambari: [], giris_ambari: [], stok_adi: [] })

  const [sourcePage, setSourcePage] = useState('')
  const [widgetType, setWidgetType] = useState('chart')
  const [title,      setTitle]      = useState('')
  const [color,      setColor]      = useState('#2563eb')

  const [config, setConfig] = useState({
    chart_type:   'bar',
    metric:       'sum_toplam',
    group_by:     'stok_adi',
    data_limit:   10,
    date_filter:  'all',
    start_date:   '',
    end_date:     '',
    cikis_ambari: [],
    giris_ambari: [],
    stok_adi:     [],
    palette:            'palette1',
    show_labels:        false,
    stroke_curve:       'smooth',
    series_by:          null,
    label_angle:        null,
    threshold_enabled:  false,
    threshold_value:    null,
  })

  const [preview,    setPreview]    = useState(null)
  const [filterSearch, setFilterSearch] = useState({ cikis_ambari: '', giris_ambari: '', stok_adi: '' })
  const debounceRef                 = useRef(null)

  const setConf = (key, val) => setConfig(c => ({ ...c, [key]: val }))

  useEffect(() => {
    if (!tree.length) fetchTree()
    const FKEY = 'filter-options'
    if (cache.has(FKEY)) { setFilterOptions(cache.get(FKEY)); return }
    client.get('/filters')
      .then(r => { setFilterOptions(r.data); cache.set(FKEY, r.data) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const slug = searchParams.get('page')
    if (slug && tree.length) {
      const p = tree.find(p => p.slug === slug)
      if (p) setSourcePage(String(p.id))
    }
  }, [tree, searchParams])

  // Edit mode: load existing widget data
  useEffect(() => {
    if (!editId) return
    getWidget(editId)
      .then(w => {
        setWidgetType(w.widget_type || 'chart')
        setTitle(w.title || '')
        setColor(w.color || '#2563eb')
        setSourcePage(String(w.page_id || ''))
        const cfg = w.config || {}
        setConfig({
          chart_type:   cfg.chart_type   || 'bar',
          metric:       cfg.metric       || 'sum_toplam',
          group_by:     cfg.group_by     || 'stok_adi',
          data_limit:   cfg.data_limit   || 10,
          date_filter:  cfg.date_filter  || 'all',
          start_date:   cfg.start_date   || '',
          end_date:     cfg.end_date     || '',
          cikis_ambari: cfg.cikis_ambari || [],
          giris_ambari: cfg.giris_ambari || [],
          stok_adi:     cfg.stok_adi     || [],
          palette:            cfg.palette           || 'palette1',
          show_labels:        cfg.show_labels        || false,
          stroke_curve:       cfg.stroke_curve       || 'smooth',
          series_by:          cfg.series_by          || null,
          label_angle:        cfg.label_angle        ?? null,
          threshold_enabled:  cfg.threshold_enabled  || false,
          threshold_value:    cfg.threshold_value    ?? null,
        })
      })
      .catch(() => setError('Widget yüklenemedi.'))
  }, [editId])

  const fetchPreview = useCallback(async () => {
    if (widgetType !== 'chart' && widgetType !== 'metric') { setPreview(null); return }
    try {
      const data = await previewWidget(widgetType, config)
      setPreview(data)
    } catch { setPreview(null) }
  }, [widgetType, config])

  useEffect(() => {
    if (config.series_by && !MULTI_SERIES_ALLOWED.has(config.chart_type)) {
      setConf('chart_type', 'bar')
    }
  }, [config.series_by])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(fetchPreview, 400)
    return () => clearTimeout(debounceRef.current)
  }, [fetchPreview])

  const handleSave = async () => {
    if (!sourcePage) { setError('Lütfen bir sayfa seçin'); return }
    if (!title.trim()) { setError('Başlık zorunlu'); return }
    setLoading(true); setError('')
    try {
      const page = tree.find(p => String(p.id) === sourcePage)
      if (editId) {
        await updateWidget(editId, { widget_type: widgetType, title: title.trim(), color, config })
      } else {
        await addWidget(parseInt(sourcePage), {
          widget_type: widgetType, title: title.trim(), color, config,
          size_x: CIRCULAR.has(config.chart_type) ? 3 : 4,
          size_y: widgetType === 'metric' ? 3 : 6,
        })
      }
      if (page) {
        navigate(page.slug === 'home' ? '/' : `/p/${page.slug}`)
      } else {
        navigate('/')
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Kaydetme hatası')
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.85rem',
    border: '1.5px solid var(--border-medium)', borderRadius: '8px',
    fontSize: '0.875rem', background: 'var(--bg-surface)', color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--sans)',
    transition: 'border-color 150ms, box-shadow 150ms',
  }

  const labelStyle = {
    display: 'block', marginBottom: '0.35rem', fontSize: '0.78rem',
    fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  function renderStep() {
    /* Adım 0: Widget türü + grafik tipi */
    if (step === 0) return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Sayfa</label>
          <select value={sourcePage} onChange={e => setSourcePage(e.target.value)} style={inputStyle}>
            <option value="">-- Sayfa seçin --</option>
            {tree.filter(p => p.slug !== 'home').map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Widget Türü</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { value: 'chart',   label: <><i className="bi bi-bar-chart-fill"></i> Grafik</> },
              { value: 'metric',  label: <><i className="bi bi-123"></i> Metrik</> },
              { value: 'routing', label: <><i className="bi bi-link"></i> Bağlantı</> },
              { value: 'system',  label: <><i className="bi bi-gear-fill"></i> Sistem</> },
            ].map(t => (
              <Pill key={t.value} active={widgetType === t.value} onClick={() => setWidgetType(t.value)}>
                {t.label}
              </Pill>
            ))}
          </div>
        </div>

        {widgetType === 'chart' && (
          <div>
            <label style={labelStyle}>Grafik Tipi</label>
            <div className="chart-type-grid">
              {CHART_TYPES.map(t => {
                const isActive   = config.chart_type === t.value
                const isDisabled = Boolean(config.series_by) && !MULTI_SERIES_ALLOWED.has(t.value)
                return (
                  <button key={t.value} type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setConf('chart_type', t.value)}
                    style={{
                      padding: '0.6rem 0.25rem', border: '1.5px solid',
                      borderColor: isActive ? 'var(--primary)' : 'var(--border-medium)',
                      borderRadius: '8px', cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontSize: '0.7rem', fontWeight: 600,
                      background: isActive ? 'var(--primary-light)' : 'var(--bg-surface)',
                      color: isDisabled
                        ? 'var(--text-tertiary)'
                        : isActive ? 'var(--primary)' : 'var(--text-secondary)',
                      opacity: isDisabled ? 0.4 : 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      transition: 'all 150ms',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )

    /* Adım 1: Veri */
    if (step === 1) return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Ölçüm (Y Ekseni)</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {METRICS.map(m => (
              <Pill key={m.value} active={config.metric === m.value} onClick={() => setConf('metric', m.value)}>
                {m.label}
              </Pill>
            ))}
          </div>
        </div>

        {!CIRCULAR.has(config.chart_type) && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Kırılım (X Ekseni / Gruplama)</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {GROUP_BY.map(g => (
                <Pill key={g.value}
                  active={config.group_by === g.value}
                  onClick={() => setConfig(c => ({
                    ...c,
                    group_by:  g.value,
                    series_by: TIME_GROUP_VALUES.has(g.value) ? c.series_by : null,
                  }))}
                >
                  {g.label}
                </Pill>
              ))}
            </div>
          </div>
        )}

          {!CIRCULAR.has(config.chart_type) && TIME_GROUP_VALUES.has(config.group_by) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Seri Boyutu</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[
                  { value: null,           label: 'Yok' },
                  { value: 'cikis_ambari', label: 'Çıkış Ambarı' },
                  { value: 'giris_ambari', label: 'Giriş Ambarı' },
                  { value: 'stok_adi',     label: 'Stok Adı' },
                ].map(s => (
                  <Pill key={String(s.value)} active={config.series_by === s.value}
                    onClick={() => setConf('series_by', s.value)}>
                    {s.label}
                  </Pill>
                ))}
              </div>
            </div>
          )}

        <div>
          <label style={labelStyle}>{config.series_by ? 'Gösterilecek Seri Sayısı' : 'Gösterilecek Kayıt Sayısı'}</label>
          <input
            type="number" min={1} max={50} value={config.data_limit}
            onChange={e => setConf('data_limit', parseInt(e.target.value) || 10)}
            style={{ ...inputStyle, width: '100px' }}
          />
          {config.series_by && (
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Multi-series modunda gösterilecek seri sayısı (toplam değere göre top-N)
            </p>
          )}
        </div>

        {widgetType === 'chart' && !CIRCULAR.has(config.chart_type) && (
          <div style={{ marginTop: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={config.threshold_enabled}
                onChange={e => setConf('threshold_enabled', e.target.checked)}
              />
              Eşik Çizgisi (Medyan)
            </label>
            {config.threshold_enabled && config.threshold_value != null && (
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  Kaydedilmiş: {Number(config.threshold_value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  onClick={() => setConf('threshold_value', null)}
                  style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', background: 'none', border: '1px solid var(--border-medium)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}
                >
                  Medyana Sıfırla
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )

    /* Adım 2: Görsel ayarlar */
    if (step === 2) return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Başlık</label>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Widget başlığı..." style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {!config.series_by && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>Renk</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  border: `2px solid ${color === c ? '#0f172a' : 'transparent'}`,
                  background: c, cursor: 'pointer', padding: 0,
                  boxShadow: color === c ? '0 0 0 3px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 150ms',
                }} />
              ))}
              <input
                type="color" value={color} onChange={e => setColor(e.target.value)}
                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }}
              />
            </div>
          </div>
        )}

        {widgetType === 'chart' && (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Renk Paleti (ApexCharts)</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {PALETTES.map(p => (
                  <Pill key={p} active={config.palette === p} onClick={() => setConf('palette', p)}>
                    {p.replace('palette', '')}
                  </Pill>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={config.show_labels} onChange={e => setConf('show_labels', e.target.checked)} />
                Veri Etiketleri Göster
              </label>

              {['line', 'area'].includes(config.chart_type) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Çizgi:
                  <select value={config.stroke_curve} onChange={e => setConf('stroke_curve', e.target.value)}
                    style={{ ...inputStyle, width: 'auto', padding: '0.35rem 0.5rem' }}>
                    <option value="smooth">Yumuşak</option>
                    <option value="straight">Düz</option>
                    <option value="stepline">Basamak</option>
                  </select>
                </label>
              )}
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <label style={labelStyle}>Alt Eksen Yazı Açısı</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {[{ label: 'Otomatik', val: null }, { label: '0°', val: 0 }, { label: '-30°', val: -30 }, { label: '-45°', val: -45 }, { label: '-90°', val: -90 }].map(opt => (
                  <Pill key={String(opt.val)} active={config.label_angle === opt.val}
                    onClick={() => setConf('label_angle', opt.val)}>
                    {opt.label}
                  </Pill>
                ))}
                <input
                  type="number" min={-90} max={0}
                  placeholder="Özel"
                  value={config.label_angle != null && ![-30,-45,-90,0].includes(config.label_angle) ? config.label_angle : ''}
                  onChange={e => {
                    const v = e.target.value === '' ? null : Math.max(-90, Math.min(0, parseInt(e.target.value) || 0))
                    setConf('label_angle', v)
                  }}
                  style={{ ...inputStyle, width: '70px' }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    )

    /* Adım 3: Filtreler + Kaydet */
    if (step === 3) return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Tarih Aralığı</label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {DATE_FILTERS.map(d => (
              <Pill key={d.value} active={config.date_filter === d.value} onClick={() => setConf('date_filter', d.value)}>
                {d.label}
              </Pill>
            ))}
          </div>
          {config.date_filter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                <label style={labelStyle}>Başlangıç</label>
                <input type="date" value={config.start_date} onChange={e => setConf('start_date', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Bitiş</label>
                <input type="date" value={config.end_date} onChange={e => setConf('end_date', e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        {['cikis_ambari', 'giris_ambari', 'stok_adi'].map(field => {
          const opts = filterOptions[field]
          if (!opts?.length) return null
          const isSeries  = config.series_by === field
          const baseLabel = { cikis_ambari: 'Çıkış Ambarı', giris_ambari: 'Giriş Ambarı', stok_adi: 'Stok Adı' }[field]
          const showSearch = opts.length > 10
          const term = filterSearch[field].toLowerCase()
          const visible = showSearch && term ? opts.filter(v => v.toLowerCase().includes(term)) : opts
          return (
            <div key={field} style={{ marginBottom: '1.25rem' }}>
              <label style={labelStyle}>{baseLabel}{isSeries ? ' (Seriler)' : ''}</label>
              {isSeries && config[field].length === 0 && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0 0 0.4rem' }}>
                  Seçim yapılmazsa en yüksek 5 otomatik gösterilir.
                </p>
              )}
              {showSearch && (
                <input
                  type="text"
                  placeholder={`${baseLabel} ara...`}
                  value={filterSearch[field]}
                  onChange={e => setFilterSearch(s => ({ ...s, [field]: e.target.value }))}
                  style={{ ...inputStyle, marginBottom: '0.5rem', padding: '0.4rem 0.7rem', fontSize: '0.8rem' }}
                />
              )}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto' }}>
                {visible.map(v => (
                  <Pill key={v}
                    active={config[field].includes(v)}
                    onClick={() => setConf(field, config[field].includes(v)
                      ? config[field].filter(x => x !== v)
                      : [...config[field], v]
                    )}
                  >
                    {v}
                  </Pill>
                ))}
                {showSearch && term && visible.length === 0 && (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>Sonuç yok</span>
                )}
              </div>
            </div>
          )
        })}

        {error && (
          <div style={{
            padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  const previewData = preview?.chart_data

  return (
    <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem 4rem' }}>
      <h1 style={{
        fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)',
        marginBottom: '0.5rem', letterSpacing: '-0.02em',
      }}>
        {editId ? 'Widget Düzenle' : 'Widget Oluştur'}
      </h1>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {editId ? 'Widget ayarlarını düzenleyin ve kaydedin.' : 'Adım adım ilerleyerek dashboard\'unuza yeni bir görsel ekleyin.'}
      </p>

      <StepBar current={step} />

      <div className="add-widget-layout">
        {/* Form paneli */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
            borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)',
          }}>
            {renderStep()}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
              className="btn-secondary"
              style={{ minWidth: '100px' }}
            >
              {step === 0 ? 'İptal' : '← Geri'}
            </button>

            {step < STEPS.length - 1
              ? <button type="button" onClick={() => setStep(s => s + 1)} className="btn-primary" style={{ minWidth: '100px' }}>
                  İleri →
                </button>
              : <button type="button" onClick={handleSave} disabled={loading} className="btn-primary" style={{ minWidth: '120px' }}>
                  {loading ? 'Kaydediliyor...' : <><i className="bi bi-check-lg"></i> Kaydet</>}
                </button>
            }
          </div>
        </div>

        {/* Önizleme paneli */}
        <div className="add-widget-preview" style={{
          width: '260px', flexShrink: 0,
          background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
          borderRadius: '12px', padding: '1rem', boxShadow: 'var(--shadow-sm)',
          position: 'sticky', top: '1rem',
        }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
          }}>
            Canlı Önizleme
          </div>

          {widgetType === 'metric' ? (
            <div style={{
              background: `linear-gradient(135deg,${color},#06b6d4)`,
              borderRadius: '10px', padding: '1.5rem', textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                {title || 'Başlık'}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
                {preview?.total_value
                  ? preview.total_value >= 1000000
                    ? `₺${(preview.total_value / 1000000).toFixed(1)}M`
                    : `₺${preview.total_value.toLocaleString('tr-TR')}`
                  : '—'
                }
              </div>
            </div>
          ) : widgetType === 'chart' ? (
            <div style={{ height: '220px' }}>
              <MiniPreview chartData={previewData} chartType={config.chart_type} color={color} palette={config.palette} />
            </div>
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
              Bu widget türü için önizleme yok.
            </div>
          )}

          {title && (
            <div style={{
              marginTop: '0.75rem', fontSize: '0.8rem', fontWeight: 600,
              color: 'var(--text-secondary)', textAlign: 'center',
            }}>
              {title}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
