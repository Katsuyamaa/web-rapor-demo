import Chart from 'react-apexcharts'
import { useContext, useRef, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { DarkModeContext } from '../../App'

const TYPE_MAP = {
  line: 'line', area: 'area', bar: 'bar', horizontalBar: 'bar',
  pie: 'pie', donut: 'donut', doughnut: 'donut', polarArea: 'polarArea',
  radar: 'radar', scatter: 'scatter', heatmap: 'heatmap',
  treemap: 'treemap', radialBar: 'radialBar', stackedBar: 'bar',
}
const CIRCULAR   = new Set(['pie', 'donut', 'polarArea', 'radialBar'])
const TIME_GROUPS = new Set(['gun', 'hafta', 'ay', 'yil'])

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ApexChartWidget({ widget }) {
  const { dark } = useContext(DarkModeContext)
  const containerRef   = useRef(null)
  const isDragging     = useRef(false)
  const chartGlobals   = useRef(null)
  const chartInstance  = useRef(null)
  const cd = widget.chart_data

  const isMulti = Array.isArray(cd?.series)

  const computedMedian = useCallback(() => {
    if (!cd) return 0
    const vals = isMulti
      ? (cd.series || []).flatMap(s => s.data || []).map(Number).filter(v => !isNaN(v))
      : (cd.values || []).map(Number).filter(v => !isNaN(v))
    if (!vals.length) return 0
    const sorted = [...vals].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }, [cd, isMulti])

  const [dragThreshold, setDragThreshold] = useState(null)

  const isEmpty = !cd ||
    (!isMulti && (!cd.values || cd.values.length === 0)) ||
    (isMulti  && (!cd.series || cd.series.length === 0))

  if (isEmpty) return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center',
      background: 'var(--bg-surface)', borderRadius: '12px',
      border: '1px dashed var(--border-medium)', padding: '1.5rem',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: 0.4 }}><i className="bi bi-inbox"></i></div>
      <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Veri Bulunamadı</div>
      <div style={{ fontSize: '0.75rem', lineHeight: 1.4 }}>
        Filtrelere veya yapılandırmaya uygun<br/>gösterilecek veri yok.
      </div>
    </div>
  )

  const cfg         = widget.config || {}
  const type        = TYPE_MAP[cd.type] || 'bar'
  const isCircular  = CIRCULAR.has(type)
  const isHoriz     = cd.type === 'horizontalBar'
  const isStacked   = cd.type === 'stackedBar'
  const isTimeGroup = TIME_GROUPS.has(cfg.group_by)

  const thresholdEnabled = !isCircular && cfg.threshold_enabled === true
  const activeThreshold  = thresholdEnabled
    ? (dragThreshold ?? cfg.threshold_value ?? computedMedian())
    : null

  const formatNumber = (v) => {
    if (v == null || isNaN(v)) return ''
    return Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 })
  }

  const labelColor = dark ? '#94a3b8' : '#475569'
  const mutedColor = dark ? '#64748b' : '#94a3b8'

  const options = {
    chart: {
      type,
      toolbar:          { show: false },
      fontFamily:       'inherit',
      background:       'transparent',
      animations:       { enabled: true, speed: 400 },
      parentHeightOffset: 0,
      stacked:          isStacked,
      foreColor:        labelColor,
      events: {
        mounted: (chart) => { chartGlobals.current = chart.w.globals; chartInstance.current = chart },
        updated: (chart) => { chartGlobals.current = chart.w.globals; chartInstance.current = chart },
      },
    },
    theme: {
      mode:    dark ? 'dark' : 'light',
      palette: isMulti ? (cfg.palette || 'palette1') : undefined,
    },
    colors: (() => {
      if (thresholdEnabled && !isMulti && type === 'bar' && activeThreshold != null) {
        return (cd.values || []).map(v => Number(v) >= activeThreshold ? '#22c55e' : '#ef4444')
      }
      return isMulti
        ? undefined
        : [widget.color || '#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    })(),
    plotOptions: {
      bar: {
        horizontal:   isHoriz,
        borderRadius: 5,
        columnWidth:  '58%',
        borderRadiusApplication: 'end',
        distributed: thresholdEnabled && !isMulti && type === 'bar',
      },
      pie:       { donut: { size: '65%' } },
      radialBar: {
        hollow:     { size: '60%' },
        dataLabels: { name: { show: true }, value: { show: true, formatter: formatNumber } },
      },
    },
    dataLabels: {
      enabled: cfg.show_labels === true,
      formatter: formatNumber,
      style: { fontSize: '11px', fontWeight: 700, colors: [dark ? '#fff' : '#1e293b'] },
      dropShadow: { enabled: true, blur: 3, opacity: 0.15, color: dark ? '#000' : '#fff' },
    },
    stroke: {
      show:  true,
      curve: cfg.stroke_curve || 'smooth',
      width: (type === 'line' || type === 'area') ? 2.5 : (isCircular ? 2 : 0),
      colors: isCircular ? ['var(--bg-surface, #fff)'] : undefined,
    },
    fill: type === 'area' ? {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.04, stops: [0, 100] },
    } : {},
    xaxis: {
      categories: isCircular ? [] : cd.labels,
      labels: {
        show:   !isCircular,
        style:  { fontSize: '11px', colors: labelColor },
        rotate: cfg.label_angle != null ? Number(cfg.label_angle) : ((isTimeGroup && cd.labels?.length > 8) ? -30 : 0),
        rotateAlways: cfg.label_angle != null && Number(cfg.label_angle) !== 0,
      },
      axisBorder: { color: mutedColor },
      axisTicks:  { color: mutedColor },
    },
    yaxis: {
      show: !isCircular,
      labels: {
        style: { fontSize: '11px', colors: labelColor },
        ...(isHoriz ? {} : { formatter: formatNumber }),
      },
    },
    labels:  isCircular ? cd.labels : [],
    legend: {
      show:     isCircular || (!(thresholdEnabled && !isMulti && type === 'bar') && (isMulti || cd.labels?.length <= 12)),
      position: 'bottom',
      fontSize: '12px',
      labels:   { colors: labelColor, useSeriesColors: false },
      markers:  { offsetX: -2 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    ...(thresholdEnabled && activeThreshold != null ? {
      annotations: isHoriz ? {
        xaxis: [
          {
            x: activeThreshold,
            strokeDashArray: 5,
            borderColor: '#64748b',
            borderWidth: 2,
            label: {
              text: Number(activeThreshold).toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
              style: { color: '#fff', background: '#64748b', fontSize: '10px' },
              position: 'top',
              orientation: 'horizontal',
              offsetY: 8,
            },
          },
          { x: 0,               x2: activeThreshold, fillColor: '#ef4444', opacity: 0.07 },
          { x: activeThreshold, x2: 1e12,            fillColor: '#22c55e', opacity: 0.07 },
        ],
      } : {
        yaxis: [
          {
            y: activeThreshold,
            strokeDashArray: 5,
            borderColor: '#64748b',
            borderWidth: 2,
            label: {
              text: Number(activeThreshold).toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
              style: { color: '#fff', background: '#64748b', fontSize: '10px' },
              position: 'right',
              offsetX: -8,
            },
          },
          { y: 0,               y2: activeThreshold, fillColor: '#ef4444', opacity: 0.07 },
          { y: activeThreshold, y2: 1e12,            fillColor: '#22c55e', opacity: 0.07 },
        ],
      },
    } : {}),
    tooltip: {
      theme:     dark ? 'dark' : 'light',
      shared:    ['bar', 'line', 'area'].includes(type),
      intersect: !['bar', 'line', 'area'].includes(type),
      y:         { formatter: formatNumber },
    },
    grid: {
      borderColor:     dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
      strokeDashArray: 3,
      padding:         { left: 4, right: 4 },
    },
    responsive: [{
      breakpoint: 480,
      options: { chart: { height: 280 }, legend: { position: 'bottom' } },
    }],
  }

  const series = isCircular
    ? cd.values
    : type === 'radialBar'
      ? cd.values
      : isMulti
        ? cd.series
        : [{ name: widget.title, data: cd.values }]

  function getThresholdFromMouse(clientX, clientY) {
    if (!containerRef.current) return null
    const rect   = containerRef.current.getBoundingClientRect()
    const g      = chartGlobals.current
    const minVal = g?.minY ?? 0
    const maxVal = g?.maxY ?? 1
    if (isHoriz) {
      const relX  = clientX - rect.left
      const ratio = Math.max(0, Math.min(1, relX / rect.width))
      return minVal + ratio * (maxVal - minVal)
    }
    const relY  = clientY - rect.top
    const ratio = Math.max(0, Math.min(1, relY / rect.height))
    return maxVal - ratio * (maxVal - minVal)
  }

  function onDragStart(e) {
    if (!thresholdEnabled) return
    isDragging.current = true
    setDragThreshold(getThresholdFromMouse(e.clientX, e.clientY))
  }

  function onDragMove(e) {
    if (!isDragging.current) return
    setDragThreshold(getThresholdFromMouse(e.clientX, e.clientY))
  }

  function onDragEnd() {
    isDragging.current = false
  }

  function handlePng() {
    const svgEl = containerRef.current?.querySelector('svg')
    if (!svgEl) return
    const EXPORT_W = 1400
    const srcW = Math.max(1, parseFloat(svgEl.getAttribute('width')) || svgEl.clientWidth || 800)
    const srcH = Math.max(1, parseFloat(svgEl.getAttribute('height')) || svgEl.clientHeight || 400)
    const EXPORT_H = Math.round(EXPORT_W * srcH / srcW)
    const clone = svgEl.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
    clone.setAttribute('viewBox', `0 0 ${srcW} ${srcH}`)
    clone.setAttribute('width', EXPORT_W)
    clone.setAttribute('height', EXPORT_H)
    const svgStr = new XMLSerializer().serializeToString(clone)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = EXPORT_W; canvas.height = EXPORT_H
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)
      ctx.drawImage(img, 0, 0, EXPORT_W, EXPORT_H)
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${widget.title || 'grafik'}.png`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      }, 'image/png')
    }
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`
  }

  function handleExcel() {
    const title = widget.title || 'grafik'
    let rows
    if (isMulti) {
      const labels = cd.labels || []
      rows = [['Etiket', ...(cd.series || []).map(s => s.name)]]
      labels.forEach((lbl, i) => rows.push([lbl, ...(cd.series || []).map(s => s.data?.[i] ?? '')]))
    } else {
      rows = [['Etiket', 'Değer']]
      ;(cd.labels || []).forEach((lbl, i) => rows.push([lbl, cd.values?.[i] ?? '']))
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Veri')
    XLSX.writeFile(wb, `${title}.xlsx`)
  }

  return (
    <div
      style={{
        height: '100%', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-surface)', borderRadius: '12px',
        border: '1px solid var(--border-medium)',
        borderTop: `3px solid ${widget.color || 'var(--primary)'}`,
        boxShadow: 'var(--shadow-sm)', boxSizing: 'border-box', overflow: 'hidden',
        transition: 'box-shadow 200ms var(--ease-out-strong), transform 200ms var(--ease-out-strong)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        marginBottom: '0.6rem',
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
          background: widget.color || 'var(--primary)',
        }} />
        <div style={{
          flex: 1, fontSize: '0.82rem', fontWeight: 700,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {widget.title}
        </div>
      </div>
      <div
        ref={containerRef}
        className="widget-chart-wrap"
        style={{ flex: 1, minHeight: 0, minWidth: 0, position: 'relative', width: '100%', overflow: 'hidden' }}
        onMouseDown={onDragStart}
        onMouseMove={onDragMove}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
      >
        <Chart
          key={`${widget.id}-${dark ? 'd' : 'l'}-${widget.color || 'c'}-${isMulti ? 'm' : 's'}-${thresholdEnabled ? 't' : 'n'}`}
          options={options}
          series={series}
          type={type}
          width="100%"
          height="100%"
        />
        {thresholdEnabled && (
          <div style={{
            position: 'absolute', inset: 0,
            cursor: isHoriz ? 'ew-resize' : 'ns-resize',
            zIndex: 10,
            userSelect: 'none',
          }} />
        )}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: '0.35rem',
        paddingTop: '0.4rem',
      }}>
        <button onClick={handlePng} title="PNG indir" style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          background: 'var(--bg-hover)', border: '1px solid var(--border-light)',
          cursor: 'pointer', padding: '4px 10px',
          color: 'var(--text-secondary)', fontSize: '0.78rem', borderRadius: '6px',
          lineHeight: 1, flexShrink: 0, transition: 'all 150ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <i className="bi bi-image" /> PNG
        </button>
        <button onClick={handleExcel} title="Excel indir" style={{
          display: 'flex', alignItems: 'center', gap: '0.3rem',
          background: 'var(--bg-hover)', border: '1px solid var(--border-light)',
          cursor: 'pointer', padding: '4px 10px',
          color: 'var(--text-secondary)', fontSize: '0.78rem', borderRadius: '6px',
          lineHeight: 1, flexShrink: 0, transition: 'all 150ms',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-active)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <i className="bi bi-file-earmark-excel" /> Excel
        </button>
      </div>
    </div>
  )
}
