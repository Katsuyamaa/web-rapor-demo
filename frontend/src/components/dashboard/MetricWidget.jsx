import { useRef, useState, useEffect } from 'react'

export default function MetricWidget({ widget }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // baseline dimensions a "normal" sized metric widget
      const s = Math.min(width / 220, height / 100)
      setScale(Math.min(Math.max(s, 0.32), 1))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const val   = widget.total_value || 0
  const isInt = ['active_users', 'total_docs'].includes(widget.system_key)
             || ['count_id', 'sum_miktar', 'count_docs'].includes(widget.config?.metric)

  const fmt = v => isInt
    ? v.toLocaleString('tr-TR')
    : `₺${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const color1   = widget.color || '#2563eb'
  const gradient = `linear-gradient(135deg, ${color1}ee, ${color1}99)`

  const valueSz = `${(2.2 * scale).toFixed(2)}rem`
  const labelSz = `${Math.max(0.52, 0.72 * scale).toFixed(2)}rem`
  const subSz   = `${Math.max(0.50, 0.72 * scale).toFixed(2)}rem`
  const pad     = `${Math.max(0.5, 1.25 * scale).toFixed(2)}rem ${Math.max(0.5, 1.5 * scale).toFixed(2)}rem`
  const gap     = `${Math.max(0.2, 0.6 * scale).toFixed(2)}rem`

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: pad, background: gradient, borderRadius: '12px',
        boxShadow: `0 4px 20px ${color1}40`,
        transition: 'transform 200ms var(--ease-out-strong), box-shadow 200ms var(--ease-out-strong)',
        cursor: 'default', overflow: 'hidden', position: 'relative',
        boxSizing: 'border-box',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.005)'
        e.currentTarget.style.boxShadow = `0 10px 28px ${color1}55`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = `0 4px 20px ${color1}40`
      }}
    >
      {/* decorative circles — only render when there's space */}
      {scale > 0.55 && <>
        <div style={{
          position: 'absolute', top: '-24px', right: '-24px',
          width: '90px', height: '90px',
          background: 'rgba(255,255,255,0.10)', borderRadius: '50%',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-32px', left: '-16px',
          width: '110px', height: '110px',
          background: 'rgba(255,255,255,0.06)', borderRadius: '50%',
          pointerEvents: 'none',
        }} />
      </>}

      <div className="widget-metric-label" style={{
        fontSize: labelSz, color: 'rgba(255,255,255,0.75)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: gap, position: 'relative',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        maxWidth: '100%',
      }}>
        {widget.title}
      </div>

      <div className="widget-metric-value" style={{
        fontSize: valueSz, fontWeight: 800, color: '#fff',
        letterSpacing: '-0.03em', lineHeight: 1.05, position: 'relative',
        textShadow: '0 2px 8px rgba(0,0,0,0.15)',
        whiteSpace: 'nowrap',
      }}>
        {fmt(val)}
      </div>

      {widget.doc_count > 0 && scale > 0.45 && (
        <div className="widget-metric-sub" style={{
          fontSize: subSz, color: 'rgba(255,255,255,0.65)',
          marginTop: gap, fontWeight: 500, position: 'relative',
          background: 'rgba(0,0,0,0.12)', borderRadius: '20px',
          padding: '0.2rem 0.6rem',
        }}>
          {widget.doc_count.toLocaleString('tr-TR')} evrak
        </div>
      )}
    </div>
  )
}
