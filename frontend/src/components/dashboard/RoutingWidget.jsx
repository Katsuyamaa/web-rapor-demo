import { useNavigate } from 'react-router-dom'

export default function RoutingWidget({ widget }) {
  const navigate = useNavigate()
  const target   = widget.config?.target_page_slug

  return (
    <div
      onClick={() => target && navigate(`/p/${target}`)}
      className={target ? "pressable" : ""}
      style={{
        height:'100%', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', cursor: target ? 'pointer' : 'default',
        border:`1px solid ${widget.color || 'var(--accent-primary)'}40`,
        borderRadius:'12px', 
        background:`linear-gradient(145deg, var(--bg-surface) 0%, ${widget.color || 'var(--accent-primary)'}08 100%)`,
        gap:'0.75rem', 
        userSelect:'none',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 200ms var(--ease-out-strong), box-shadow 200ms var(--ease-out-strong), border-color 200ms var(--ease-out-strong)',
      }}
      onMouseEnter={e => { 
        if(target) {
          e.currentTarget.style.transform='translateY(-4px)'
          e.currentTarget.style.boxShadow='var(--shadow-md)'
          e.currentTarget.style.borderColor = widget.color || 'var(--accent-primary)'
        }
      }}
      onMouseLeave={e => { 
        if(target) {
          e.currentTarget.style.transform='translateY(0)'
          e.currentTarget.style.boxShadow='var(--shadow-sm)'
          e.currentTarget.style.borderColor = `${widget.color || 'var(--accent-primary)'}40`
        }
      }}
    >
      <span style={{ fontSize:'2.5rem' }}>{widget.config?.icon || <i className="bi bi-box-seam"></i>}</span>
      <span style={{ fontWeight:700, color: 'var(--text-primary)', fontSize:'1.1rem' }}>{widget.title}</span>
      {target && <span style={{ fontSize:'0.8rem', color: widget.color || 'var(--accent-primary)', fontWeight: 600, opacity: 0.8 }}>Tıkla → Sayfaya git</span>}
    </div>
  )
}
