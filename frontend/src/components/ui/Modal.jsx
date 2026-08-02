import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, maxWidth = 480 }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-popup)',
        border: '1px solid var(--border-medium)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%', maxWidth,
        padding: '1.5rem',
        animation: 'modalIn 180ms cubic-bezier(0.23,1,0.32,1)',
      }}>
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(8px)}to{opacity:1;transform:none}}`}</style>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>{title}</div>
            <button onClick={onClose} style={{
              background: 'var(--bg-hover)', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '4px 8px',
              borderRadius: '6px', lineHeight: 1, display: 'flex', alignItems: 'center',
            }}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
