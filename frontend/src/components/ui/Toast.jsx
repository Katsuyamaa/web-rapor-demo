import useToastStore from '../../store/toastStore'

const COLORS = {
  success: { bg: '#dcfce7', border: '#16a34a', text: '#15803d', icon: <i className="bi bi-check-circle-fill"></i> },
  error:   { bg: '#fee2e2', border: '#dc2626', text: '#b91c1c', icon: <i className="bi bi-x-circle-fill"></i> },
  warning: { bg: '#fef9c3', border: '#ca8a04', text: '#a16207', icon: <i className="bi bi-exclamation-triangle-fill"></i> },
  info:    { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8', icon: <i className="bi bi-info-circle-fill"></i> },
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
      zIndex: 9999, maxWidth: '360px',
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type] || COLORS.info
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: '10px',
            padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', animation: 'slideUp 0.2s ease',
          }}>
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{c.icon}</span>
            <span style={{ fontSize: '0.875rem', color: c.text, flex: 1, fontWeight: 500 }}>{t.message}</span>
            <button onClick={() => dismiss(t.id)} style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 0, opacity: 0.6 }}>×</button>
          </div>
        )
      })}
    </div>
  )
}
