import { useState, useRef, useEffect } from 'react'

export default function MultiSelect({ label, options = [], value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = options.filter(o =>
    o.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else onChange([...value, opt])
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
        {label} {value.length > 0 && <span style={{ color: 'var(--primary)' }}>({value.length})</span>}
      </label>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: '42px', padding: '0.4rem 0.75rem', border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border-medium)'}`,
          borderRadius: '8px', background: 'var(--bg-surface)', cursor: 'pointer',
          display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center',
        }}
      >
        {value.length === 0 && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Seçiniz...</span>
        )}
        {value.map(v => (
          <span key={v} style={{
            background: 'var(--primary)', color: 'white', borderRadius: '4px',
            padding: '0.15rem 0.5rem', fontSize: '0.75rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            {v}
            <span onClick={e => { e.stopPropagation(); toggle(v) }} style={{ cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}>×</span>
          </span>
        ))}
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-popup)', border: '1px solid var(--border-medium)',
          borderRadius: '8px', boxShadow: 'var(--shadow-md)', marginTop: '4px',
          maxHeight: '260px', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '0.5rem' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ara..."
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', padding: '0.45rem 0.65rem', border: '1px solid var(--border-medium)',
                borderRadius: '6px', fontSize: '0.85rem', background: 'var(--bg-popup)',
                color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {value.length > 0 && (
              <div
                onClick={() => { onChange([]); setOpen(false); setSearch('') }}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--error)', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
              >
                <i className="bi bi-x-lg"></i> Seçimi Temizle
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Sonuç yok</div>
            )}
            {(() => { const selectedSet = new Set(value); return filtered.map(opt => (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-primary)',
                  background: selectedSet.has(opt) ? 'rgba(59,130,246,0.10)' : 'transparent',
                }}
              >
                <span style={{ width: '16px', height: '16px', border: `2px solid ${selectedSet.has(opt) ? 'var(--primary)' : 'var(--border-medium)'}`, borderRadius: '3px', background: selectedSet.has(opt) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selectedSet.has(opt) && <span style={{ color: 'white', fontSize: '0.65rem', fontWeight: 700 }}><i className="bi bi-check-lg"></i></span>}
                </span>
                {opt}
              </div>
            )) })()}
          </div>
        </div>
      )}
    </div>
  )
}
