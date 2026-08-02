import { confirmDialog } from '../../store/dialogStore'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { getWarehouses, getInventory, initInventory, bulkSave, getColumnLabels } from '../../api/cost'

const today = () => new Date().toISOString().slice(0, 10)
const yesterday = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Column groups with colors — labels overridden per ambar at runtime
// diger is last so it always sits immediately left of the "Not" column
const BASE_COL_GROUPS = [
  { key: 'uretim',        label: 'Üretim',        color: '#16a34a', bg: 'rgba(22,163,74,0.07)',   readonly: false },
  { key: 'sevkiyat',      label: 'Sevkiyat',      color: '#d97706', bg: 'rgba(217,119,6,0.07)',   readonly: false },
  { key: 'sistem_cikisi', label: 'Sistem Çıkışı', color: '#64748b', bg: 'rgba(100,116,139,0.07)', readonly: true  },
  { key: 'yemekhane',     label: 'Yemekhane',     color: '#2563eb', bg: 'rgba(37,99,235,0.07)',   readonly: false },
  { key: 'online',        label: 'Online',        color: '#7c3aed', bg: 'rgba(124,58,237,0.07)',  readonly: false },
  { key: 'ikram',         label: 'İkram',         color: '#0891b2', bg: 'rgba(8,145,178,0.07)',   readonly: false },
  { key: 'zayii',         label: 'Zayii',         color: '#dc2626', bg: 'rgba(220,38,38,0.07)',   readonly: false },
  { key: 'extra1',        label: 'Ekstra 1',      color: '#f59e0b', bg: 'rgba(245,158,11,0.07)',  readonly: false },
  { key: 'extra2',        label: 'Ekstra 2',      color: '#ec4899', bg: 'rgba(236,72,153,0.07)',  readonly: false },
  { key: 'extra3',        label: 'Ekstra 3',      color: '#06b6d4', bg: 'rgba(6,182,212,0.07)',   readonly: false },
  { key: 'extra4',        label: 'Ekstra 4',      color: '#84cc16', bg: 'rgba(132,204,22,0.07)',  readonly: false },
  { key: 'extra5',        label: 'Ekstra 5',      color: '#a78bfa', bg: 'rgba(167,139,250,0.07)', readonly: false },
  { key: 'diger',         label: 'Diğer',         color: '#9ca3af', bg: 'rgba(156,163,175,0.07)', readonly: false },
]

const EXTRA_KEYS = new Set(['extra1', 'extra2', 'extra3', 'extra4', 'extra5'])

function calcKalan(e) {
  const v = (e.mevcut || 0) + (e.uretim || 0)
    - (e.sevkiyat || 0) - (e.yemekhane || 0)
    - (e.online || 0) - (e.ikram || 0)
    - (e.zayii || 0) - (e.diger || 0)
    - (e.extra1 || 0) - (e.extra2 || 0) - (e.extra3 || 0)
    - (e.extra4 || 0) - (e.extra5 || 0)
  return Math.round(v * 1000) / 1000
}

// ── Searchable Ambar Picker ────────────────────────────────────────────────────
function AmbarPicker({ warehouses, value, onChange }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const ref                   = useRef(null)

  const filtered = warehouses.filter(w =>
    w.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (w) => {
    onChange(w)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 240 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          border: '1px solid var(--border-medium)', borderRadius: 8,
          background: 'var(--bg-surface)', padding: '0.45rem 0.75rem',
          cursor: 'pointer', boxShadow: 'var(--shadow-sm)',
        }}
        onClick={() => setOpen(o => !o)}
      >
        <i className="bi bi-building" style={{ color: 'var(--primary)', fontSize: '0.85rem' }} />
        <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {value || 'Ambar seçin…'}
        </span>
        <i className={`bi bi-chevron-${open ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }} />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-popup)', border: '1px solid var(--border-medium)',
          borderRadius: 8, boxShadow: 'var(--shadow-md)', zIndex: 200,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '0.4rem' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ara…"
              style={{
                width: '100%', padding: '0.4rem 0.6rem', borderRadius: 6,
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-main)', color: 'var(--text-primary)',
                fontSize: '0.83rem', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '0.6rem 0.85rem', fontSize: '0.83rem', color: 'var(--text-tertiary)' }}>Sonuç yok</div>
            ) : filtered.map(w => (
              <div
                key={w}
                onClick={() => select(w)}
                style={{
                  padding: '0.5rem 0.85rem', fontSize: '0.875rem', cursor: 'pointer',
                  color: w === value ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: w === value ? 600 : 400,
                  background: w === value ? 'rgba(99,102,241,0.08)' : 'transparent',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { if (w !== value) e.currentTarget.style.background = 'var(--bg-main)' }}
                onMouseLeave={e => { if (w !== value) e.currentTarget.style.background = 'transparent' }}
              >
                {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ana Sayfa ─────────────────────────────────────────────────────────────────
export default function CostInventoryPage() {
  const hasRole = useAuthStore(s => s.hasRole)
  const isAdmin = hasRole('admin')

  const [warehouses, setWarehouses]       = useState([])
  const [selectedAmbar, setSelectedAmbar] = useState('')
  const [selectedDate, setSelectedDate]   = useState(yesterday())
  const [data, setData]                   = useState(null)
  const [entries, setEntries]             = useState([])
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')
  const [colLabels, setColLabels]         = useState({})

  useEffect(() => {
    getWarehouses().then(ws => {
      setWarehouses(ws)
      if (ws.length > 0) {
        setSelectedAmbar(ws[0])
        getColumnLabels(ws[0]).then(setColLabels).catch(() => {})
      }
    })
  }, [])

  const fetchInventory = useCallback(async (dateStr, ambar) => {
    setLoading(true)
    setError('')
    try {
      const res = await getInventory(dateStr, ambar)
      setData(res)
      setEntries(res.entries.map(e => ({ ...e })))
    } catch {
      setError('Veri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAmbar) fetchInventory(selectedDate, selectedAmbar)
  }, [selectedDate, selectedAmbar, fetchInventory])

  const handleAmbarChange = (ambar) => {
    setSelectedAmbar(ambar)
    setData(null)
    setEntries([])
    getColumnLabels(ambar).then(setColLabels).catch(() => {})
  }

  const colGroups = BASE_COL_GROUPS
    .filter(c => {
      if (c.readonly) return true
      if (EXTRA_KEYS.has(c.key)) return colLabels[c.key]?.visible === true
      return colLabels[c.key]?.visible !== false
    })
    .map(c => colLabels[c.key]?.label ? { ...c, label: colLabels[c.key].label } : c)

  const handleInit = async () => {
    setSaving(true)
    try {
      await initInventory(selectedDate, selectedAmbar)
      await fetchInventory(selectedDate, selectedAmbar)
    } catch (err) {
      setError(err?.response?.data?.error || 'Gün başlatılamadı.')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (idx, key, val) => {
    setEntries(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: val === '' ? 0 : parseFloat(val) || 0 }
      return next
    })
  }

  const handleNotesChange = (idx, val) => {
    setEntries(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], notes: val }
      return next
    })
  }

  const handleSave = async () => {
    const isPast = selectedDate < today()
    let cascade = false
    if (isPast) {
      cascade = await confirmDialog('Bu tarih geçmişte. Değişiklikler sonraki günlerin başlangıç stoğunu etkiler. Kaskad güncelleme yapılsın mı?')
    }
    setSaving(true)
    setError('')
    try {
      await bulkSave(entries, cascade)
      await fetchInventory(selectedDate, selectedAmbar)
    } catch {
      setError('Kayıt sırasında hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem 1.75rem', maxWidth: '100%' }}>

      {/* Başlık */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Envanter Takip</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Günlük ürün bazlı stok yönetimi</p>
        </div>
        {isAdmin && (
          <Link
            to="/cost/urunler"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'var(--bg-surface)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-medium)', borderRadius: 8,
              padding: '0.45rem 1rem', fontSize: '0.83rem', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <i className="bi bi-boxes" />
            Ürün Yönetimi
          </Link>
        )}
      </div>

      {/* Kontroller: Ambar + Tarih */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem',
      }}>
        <AmbarPicker warehouses={warehouses} value={selectedAmbar} onChange={handleAmbarChange} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            <i className="bi bi-calendar3" style={{ marginRight: '0.3rem' }} />
            Tarih
          </label>
          <input
            type="date"
            value={selectedDate}
            max={today()}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem', borderRadius: 8,
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              fontSize: '0.875rem', cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          />
          {selectedDate !== yesterday() && (
            <button
              onClick={() => setSelectedDate(yesterday())}
              style={{
                padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid var(--border-medium)',
                background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Dün
            </button>
          )}
        </div>
      </div>

      {/* Hata */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', color: '#dc2626',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <i className="bi bi-exclamation-triangle-fill" />
          {error}
        </div>
      )}

      {/* İçerik */}
      {!selectedAmbar ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
          Bir ambar seçin.
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', padding: '3rem 0', fontSize: '0.875rem' }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--border-medium)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Yükleniyor...
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
          Bu ambarda aktif ürün bulunamadı.
        </div>
      ) : !data.is_initialized ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📦</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            <strong>{selectedDate}</strong> tarihinde <strong>{selectedAmbar}</strong> için kayıt başlatılmamış.
          </p>
          <button
            onClick={handleInit}
            disabled={saving}
            style={{
              background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10,
              padding: '0.7rem 2rem', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: 'var(--shadow-primary)', opacity: saving ? 0.7 : 1,
            }}
          >
            <i className="bi bi-play-fill" style={{ marginRight: '0.4rem' }} />
            {saving ? 'Başlatılıyor...' : 'Günü Başlat'}
          </button>
        </div>
      ) : entries.length > 0 ? (
        <>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 12,
            border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.855rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-medium)' }}>
                    <th style={th('left')}>Ürün</th>
                    <th style={th()}>Birim</th>
                    <th style={{ ...th(), color: '#64748b' }}>Mevcut</th>
                    {colGroups.map(c => (
                      <th key={c.key} style={{ ...th(), color: c.color, background: c.bg }}>
                        {c.label}
                      </th>
                    ))}
                    <th style={th()}>Not</th>
                    <th style={{ ...th(), color: 'var(--text-primary)' }}>Kalan</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => {
                    const kalan = calcKalan(e)
                    const isNeg = kalan < 0
                    const noEntry = e.id == null
                    return (
                      <tr key={e.product_id} style={{ borderBottom: '1px solid var(--border-light)', opacity: noEntry ? 0.7 : 1 }}>
                        <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {e.product_name}
                        </td>
                        <td style={tdRo()}>{e.unit}</td>
                        <td style={{ padding: '0.3rem 0.35rem', background: 'rgba(100,116,139,0.05)' }}>
                          <input
                            type="number"
                            min="0"
                            value={e.mevcut === 0 ? '' : e.mevcut}
                            placeholder="0"
                            onChange={ev => handleChange(idx, 'mevcut', ev.target.value)}
                            style={{ ...numInput, borderColor: '#94a3b844' }}
                          />
                        </td>
                        {colGroups.map(c => (
                          <td key={c.key} style={{ padding: '0.3rem 0.35rem', background: c.bg }}>
                            {c.readonly ? (
                              <div style={{
                                minWidth: 60, padding: '0.32rem 0.4rem',
                                textAlign: 'center', fontSize: '0.855rem',
                                color: e[c.key] > 0 ? c.color : 'var(--text-tertiary)',
                                fontWeight: e[c.key] > 0 ? 600 : 400,
                              }}>
                                {e[c.key] || '—'}
                              </div>
                            ) : c.key === 'sevkiyat' && e.fr3002_synced ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                                <span style={{ ...tdRo(), background: 'transparent' }}>{e.sevkiyat ?? 0}</span>
                                <span title="FR3002'den eşitlendi" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>🔗</span>
                              </div>
                            ) : (
                              <input
                                type="number"
                                min="0"
                                value={e[c.key] === 0 ? '' : e[c.key]}
                                placeholder="0"
                                onChange={ev => handleChange(idx, c.key, ev.target.value)}
                                style={{ ...numInput, borderColor: `${c.color}44` }}
                              />
                            )}
                          </td>
                        ))}
                        <td style={{ padding: '0.3rem 0.35rem' }}>
                          <input
                            type="text"
                            value={e.notes || ''}
                            placeholder="—"
                            onChange={ev => handleNotesChange(idx, ev.target.value)}
                            style={{ ...numInput, width: 90, textAlign: 'left' }}
                          />
                        </td>
                        <td style={{
                          padding: '0.55rem 0.85rem', textAlign: 'center', fontWeight: 700,
                          color: isNeg ? '#dc2626' : '#16a34a',
                          background: isNeg ? 'rgba(239,68,68,0.06)' : 'rgba(22,163,74,0.05)',
                        }}>
                          {isNeg && <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '0.7rem', marginRight: '0.25rem' }} />}
                          {kalan}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {entries.some(e => e.id == null) && (
              <button
                onClick={handleInit}
                disabled={saving}
                title="Bu gün kaydı olmayan ürünler için kayıt oluşturur"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(99,102,241,0.08)', color: 'var(--primary)',
                  border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10,
                  padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <i className="bi bi-plus-circle" />
                Eksik Ürünleri Ekle ({entries.filter(e => e.id == null).length})
              </button>
            )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10,
                padding: '0.6rem 2rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: 'var(--shadow-primary)', opacity: saving ? 0.7 : 1,
              }}
            >
              <i className="bi bi-floppy2-fill" style={{ marginRight: '0.4rem' }} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </>
      ) : null}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const th = (align = 'center') => ({
  padding: '0.55rem 0.75rem', textAlign: align,
  color: 'var(--text-tertiary)', fontWeight: 600,
  fontSize: '0.76rem', whiteSpace: 'nowrap',
})

const tdRo = () => ({
  padding: '0.55rem 0.75rem', textAlign: 'center',
  color: 'var(--text-tertiary)',
  background: 'var(--bg-main)',
  fontSize: '0.855rem',
})

const numInput = {
  width: 68, padding: '0.32rem 0.4rem',
  border: '1px solid var(--border-medium)', borderRadius: 6,
  background: 'var(--bg-main)', color: 'var(--text-primary)',
  fontSize: '0.855rem', textAlign: 'center',
}
