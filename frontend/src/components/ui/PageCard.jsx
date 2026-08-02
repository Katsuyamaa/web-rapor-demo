import { useNavigate } from 'react-router-dom'

export default function PageCard({ page }) {
  const navigate = useNavigate()
  const href = page.slug === 'home' ? '/' : `/p/${page.slug}`

  return (
    <div
      onClick={() => navigate(href)}
      className="pressable"
      style={{
        border: `1px solid ${page.color || 'var(--accent-primary)'}40`,
        borderRadius: '16px', 
        padding: '2rem', 
        cursor: 'pointer', 
        textAlign: 'center',
        background: `linear-gradient(145deg, var(--bg-surface) 0%, ${page.color || 'var(--accent-primary)'}08 100%)`,
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        gap: '0.75rem',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 200ms var(--ease-out-strong), box-shadow 200ms var(--ease-out-strong), border-color 200ms var(--ease-out-strong)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
        e.currentTarget.style.borderColor = page.color || 'var(--accent-primary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
        e.currentTarget.style.borderColor = `${page.color || 'var(--accent-primary)'}40`
      }}
    >
      <span style={{ fontSize: '2.5rem' }}>{page.icon || <i className="bi bi-building"></i>}</span>
      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
        {page.title}
      </span>
      <span style={{ 
        fontSize: '0.8rem', 
        color: page.color || 'var(--accent-primary)',
        fontWeight: 600,
        opacity: 0.8
      }}>
        Detayları görüntüle →
      </span>
    </div>
  )
}
