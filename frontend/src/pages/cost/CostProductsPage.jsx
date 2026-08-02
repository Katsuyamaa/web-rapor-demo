import { confirmDialog } from '../../store/dialogStore'
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import {
  getProductsWithStock, getWarehouses,
  createProduct, updateProduct, archiveProduct, restoreProduct,
  updateDivisor, getProductHistory, setEntryField, resetEntry,
  importProductsFromErp, getColumnLabels, saveColumnLabels,
} from '../../api/cost'

// ── Inline birim düzenleme hücresi ───────────────────────────────────────────
function UnitCell({ product, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(product.unit)
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    const trimmed = value.trim().toUpperCase() || 'ADET'
    if (trimmed === product.unit) { setEditing(false); return }
    setSaving(true)
    try {
      await updateProduct(product.id, { unit: trimmed })
      onSaved()
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(product.unit); setEditing(false) } }}
        style={{
          width: 70, padding: '0.25rem 0.4rem', borderRadius: 6, textAlign: 'center',
          border: '2px solid var(--primary)',
          background: 'var(--bg-main)', color: 'var(--text-primary)',
          fontSize: '0.83rem', fontWeight: 600, outline: 'none',
        }}
      />
    )
  }

  return (
    <span
      onClick={() => { if (!saving) { setValue(product.unit); setEditing(true) } }}
      title="Tıkla ve düzenle"
      style={{
        display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 6,
        border: '1px dashed var(--border-medium)',
        color: 'var(--text-secondary)', fontSize: '0.83rem', fontWeight: 600,
        cursor: 'pointer', transition: 'border-color 120ms',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-medium)'}
    >
      {saving ? '…' : product.unit}
    </span>
  )
}

// ── Inline bölme katsayısı hücresi ──────────────────────────────────────────
function DivisorCell({ product, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(String(product.divisor || 1))
  const [saving, setSaving]   = useState(false)
  const [hasError, setHasError] = useState(false)

  const divisor = product.divisor || 1

  const save = async () => {
    const num = Math.max(0.0001, parseFloat(value) || 1)
    if (num === divisor) { setEditing(false); return }
    setSaving(true)
    setHasError(false)
    try {
      await updateDivisor(product.id, num)
      onSaved()
    } catch {
      setHasError(true)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0.0001"
        step="1"
        value={value}
        onFocus={e => e.target.select()}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(String(divisor)); setEditing(false) } }}
        style={{
          width: 70, padding: '0.25rem 0.4rem', borderRadius: 6, textAlign: 'center',
          border: '2px solid var(--primary)',
          background: 'var(--bg-main)', color: 'var(--text-primary)',
          fontSize: '0.83rem', fontWeight: 600, outline: 'none',
        }}
      />
    )
  }

  return (
    <span
      onClick={() => { if (!saving) { setValue(String(divisor)); setEditing(true) } }}
      title={hasError ? 'Kayıt başarısız — tekrar deneyin' : 'Tıkla ve düzenle — sistem çıkışı bu sayıya bölünerek gösterilir'}
      style={{
        display: 'inline-block', padding: '0.2rem 0.55rem', borderRadius: 6,
        border: hasError ? '1px solid #dc2626' : divisor !== 1 ? '1px solid rgba(99,102,241,0.4)' : '1px dashed var(--border-medium)',
        color: hasError ? '#dc2626' : divisor !== 1 ? 'var(--primary)' : 'var(--text-secondary)',
        fontSize: '0.83rem', fontWeight: 600,
        cursor: 'pointer', transition: 'border-color 120ms',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = hasError ? '#ef4444' : 'var(--primary)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = hasError ? '#dc2626' : divisor !== 1 ? 'rgba(99,102,241,0.4)' : 'var(--border-medium)'}
    >
      {saving ? '…' : hasError ? '⚠ hata' : `÷${divisor}`}
    </span>
  )
}

// Varsayılan alan tanımları — label'lar çalışma zamanında üzerine yazılır
const BASE_HIST_FIELDS = [
  { key: 'uretim',    label: 'Üretim',   color: '#16a34a' },
  { key: 'sevkiyat',  label: 'Sevk.',    color: '#d97706' },
  { key: 'yemekhane', label: 'Yemek.',   color: '#2563eb' },
  { key: 'online',    label: 'Online',   color: '#7c3aed' },
  { key: 'ikram',     label: 'İkram',    color: '#0891b2' },
  { key: 'zayii',     label: 'Zayii',    color: '#dc2626' },
  { key: 'diger',     label: 'Diğer',    color: '#9ca3af' },
  { key: 'extra1',    label: 'Ekstra 1', color: '#f59e0b' },
  { key: 'extra2',    label: 'Ekstra 2', color: '#ec4899' },
  { key: 'extra3',    label: 'Ekstra 3', color: '#06b6d4' },
  { key: 'extra4',    label: 'Ekstra 4', color: '#84cc16' },
  { key: 'extra5',    label: 'Ekstra 5', color: '#a78bfa' },
]

const EXTRA_KEYS = ['extra1', 'extra2', 'extra3', 'extra4', 'extra5']
const BASE_KEYS  = ['uretim', 'sevkiyat', 'yemekhane', 'online', 'ikram', 'zayii', 'diger']

const DEFAULT_LABELS = {
  uretim: 'Üretim', sevkiyat: 'Sevkiyat', yemekhane: 'Yemekhane',
  online: 'Online', ikram: 'İkram', zayii: 'Zayii', diger: 'Diğer',
  extra1: 'Ekstra 1', extra2: 'Ekstra 2', extra3: 'Ekstra 3',
  extra4: 'Ekstra 4', extra5: 'Ekstra 5',
}

// ── Envanter geçmişi paneli ───────────────────────────────────────────────────
function HistoryPanel({ product, onClose, colLabels }) {
  const HIST_FIELDS = BASE_HIST_FIELDS
    .filter(f => colLabels[f.key]?.visible !== false)
    .map(f => colLabels[f.key] ? { ...f, label: (colLabels[f.key].label || f.label).slice(0, 8) } : f)
  const hasRole = useAuthStore(s => s.hasRole)
  const isAdmin = hasRole('admin')

  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(false)
  // edits: { [entryId]: { [field]: newValue } }
  const [edits, setEdits]         = useState({})
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [resetting, setResetting] = useState(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setSaveError('')
    try {
      const rows = await getProductHistory(product.id)
      setHistory(rows)
    } finally {
      setLoading(false)
    }
  }, [product.id])

  useEffect(() => {
    setEdits({})
    setSaveError('')
    loadHistory()
  }, [loadHistory])

  const setFieldEdit = (entryId, field, rawVal) => {
    const v = rawVal === '' ? 0 : (parseFloat(rawVal) || 0)
    setEdits(prev => ({
      ...prev,
      [entryId]: { ...(prev[entryId] || {}), [field]: v },
    }))
  }

  const totalEdits = Object.values(edits).reduce((s, obj) => s + Object.keys(obj).length, 0)

  const handleSave = async () => {
    if (!totalEdits) return
    setSaving(true)
    setSaveError('')
    try {
      for (const [eid, fields] of Object.entries(edits)) {
        for (const [field, val] of Object.entries(fields)) {
          await setEntryField(Number(eid), field, val)
        }
      }
      setEdits({})
      await loadHistory()
    } catch {
      setSaveError('Kayıt sırasında hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (row) => {
    if (!await confirmDialog(`${row.entry_date} tarihindeki tüm değerler (mevcut, üretim, sevkiyat, ikram, zayii…) sıfırlansın mı?`)) return
    setResetting(row.id)
    try {
      await resetEntry(row.id)
      setEdits(prev => { const n = { ...prev }; delete n[row.id]; return n })
      await loadHistory()
    } catch {
      setSaveError('Sıfırlama başarısız.')
    } finally {
      setResetting(null)
    }
  }

  return (
    <div style={{
      width: 480, flexShrink: 0,
      background: 'var(--bg-surface)', borderRadius: 12,
      border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', alignSelf: 'flex-start',
      position: 'sticky', top: '1rem',
    }}>
      {/* Panel başlığı */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-medium)',
        background: 'var(--bg-main)', borderRadius: '12px 12px 0 0',
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <i className="bi bi-clock-history" style={{ marginRight: '0.35rem', color: 'var(--primary)' }} />
            Envanter Geçmişi
          </div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
            {product.name}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '1.1rem', lineHeight: 1, padding: '0.2rem' }}
        >×</button>
      </div>

      {/* İçerik */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', maxHeight: 520 }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            <div style={{ width: 18, height: 18, border: '2px solid var(--border-medium)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.6rem' }} />
            Yükleniyor…
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            Son 3 ayda kayıt bulunamadı.
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', fontSize: '0.79rem', minWidth: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-medium)' }}>
                <th style={thP('left')}>Tarih</th>
                <th style={{ ...thP(), color: '#64748b' }}>Mevcut</th>
                {HIST_FIELDS.map(f => (
                  <th key={f.key} style={{ ...thP(), color: f.color }}>{f.label}</th>
                ))}
                <th style={{ ...thP(), color: 'var(--text-primary)' }}>Kalan</th>
                {isAdmin && <th style={thP()} />}
              </tr>
            </thead>
            <tbody>
              {history.map(row => {
                const rowEdits = edits[row.id] || {}
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.35rem 0.6rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                      {row.entry_date}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center', color: '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>
                      {row.mevcut ?? 0}
                    </td>
                    {HIST_FIELDS.map(f => {
                      const isEdited = f.key in rowEdits
                      const displayVal = isEdited ? rowEdits[f.key] : (row[f.key] ?? 0)
                      return (
                        <td key={f.key} style={{ padding: '0.2rem 0.2rem', textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            value={displayVal}
                            onChange={e => setFieldEdit(row.id, f.key, e.target.value)}
                            style={{
                              width: 52, padding: '0.22rem 0.25rem', borderRadius: 5, textAlign: 'center',
                              border: isEdited ? `1px solid ${f.color}` : '1px solid var(--border-light)',
                              background: isEdited ? `${f.color}11` : 'var(--bg-main)',
                              color: 'var(--text-primary)', fontSize: '0.78rem',
                              fontWeight: isEdited ? 700 : 400, outline: 'none',
                            }}
                          />
                        </td>
                      )
                    })}
                    <td style={{
                      padding: '0.35rem 0.5rem', textAlign: 'center', fontWeight: 700, whiteSpace: 'nowrap',
                      color: row.kalan < 0 ? '#dc2626' : row.kalan > 0 ? '#16a34a' : 'var(--text-tertiary)',
                      fontSize: '0.8rem',
                    }}>
                      {row.kalan}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '0.2rem 0.4rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleReset(row)}
                          disabled={resetting === row.id}
                          style={{
                            border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.06)',
                            color: '#dc2626', cursor: 'pointer',
                            fontSize: '0.7rem', padding: '0.16rem 0.45rem', borderRadius: 5,
                            fontWeight: 600, opacity: resetting === row.id ? 0.4 : 1, whiteSpace: 'nowrap',
                          }}
                        >
                          {resetting === row.id ? '…' : 'Sıfırla'}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Alt bar */}
      <div style={{ padding: '0.65rem 1rem', borderTop: '1px solid var(--border-medium)' }}>
        {saveError && (
          <div style={{ fontSize: '0.78rem', color: '#dc2626', marginBottom: '0.5rem' }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '0.3rem' }} />
            {saveError}
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={!totalEdits || saving}
          style={{
            width: '100%', padding: '0.5rem', borderRadius: 8,
            background: totalEdits ? 'var(--primary)' : 'var(--bg-main)',
            color: totalEdits ? '#fff' : 'var(--text-tertiary)',
            fontSize: '0.83rem', fontWeight: 600, cursor: totalEdits ? 'pointer' : 'default',
            border: totalEdits ? 'none' : '1px solid var(--border-medium)',
            opacity: saving ? 0.7 : 1, transition: 'all 150ms',
          }}
        >
          {saving ? 'Kaydediliyor…' : totalEdits ? `Değişiklikleri Kaydet (${totalEdits})` : 'Değişiklik yok'}
        </button>
      </div>
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 34, height: 18, borderRadius: 9, flexShrink: 0,
        background: checked ? 'var(--primary)' : '#d1d5db',
        position: 'relative', cursor: 'pointer', transition: 'background 150ms',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        transition: 'left 150ms', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
      }} />
    </div>
  )
}

// ── Sütun satırı (label input + toggle + renk nokta) ─────────────────────────
function ColRow({ f, cfg, isCustom, onToggle, onLabel, onReset, extraRemove }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.5rem 0.65rem', borderRadius: 8,
      background: cfg.visible ? 'var(--bg-main)' : 'rgba(156,163,175,0.05)',
      border: `1px solid ${cfg.visible ? (isCustom ? f.color + '44' : 'var(--border-light)') : 'var(--border-light)'}`,
      opacity: cfg.visible ? 1 : 0.55, transition: 'all 150ms',
    }}>
      <Toggle checked={cfg.visible} onChange={onToggle} />
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0 }} />
      <input
        value={cfg.label}
        disabled={!cfg.visible}
        onChange={e => onLabel(e.target.value)}
        placeholder={DEFAULT_LABELS[f.key] || f.label}
        style={{
          flex: 1, padding: '0.2rem 0.4rem', borderRadius: 5,
          border: 'none', outline: 'none', background: 'transparent',
          color: 'var(--text-primary)', fontSize: '0.845rem',
          fontWeight: isCustom ? 600 : 400,
        }}
      />
      {onReset && isCustom && cfg.visible && (
        <button onClick={onReset} title="Varsayılana sıfırla"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '0.75rem', padding: '0.1rem 0.2rem' }}>
          ↺
        </button>
      )}
      {extraRemove && (
        <button onClick={() => onToggle(false)} title="Sütunu kaldır"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem', padding: '0.1rem 0.2rem' }}>
          ✕
        </button>
      )}
    </div>
  )
}

// ── Sağ panel: yapılandırma (ürün seçilmediğinde) ────────────────────────────
function WelcomePanel({ ambar, products, colLabels, onLabelsChange, isAdmin }) {
  const initDraft = () => BASE_HIST_FIELDS.reduce((acc, f) => ({
    ...acc,
    [f.key]: {
      label:   colLabels[f.key]?.label   ?? DEFAULT_LABELS[f.key],
      visible: colLabels[f.key]?.visible !== false,
    },
  }), {})

  const [draft, setDraft]   = useState(initDraft)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')

  useEffect(() => { setDraft(initDraft()); setMsg('') }, [ambar, colLabels])

  const setField = (key, field, val) =>
    setDraft(d => ({ ...d, [key]: { ...d[key], [field]: val } }))

  const handleSave = async () => {
    setSaving(true); setMsg('')
    try {
      await saveColumnLabels(ambar, draft)
      onLabelsChange(draft)
      setMsg('Kaydedildi.')
    } catch {
      setMsg('Kayıt başarısız.')
    } finally {
      setSaving(false)
    }
  }

  const activeCount   = products.filter(p => p.is_active).length
  const visibleCount  = BASE_HIST_FIELDS.filter(f => draft[f.key]?.visible).length
  const activeExtras  = EXTRA_KEYS.filter(k => draft[k]?.visible)
  const nextExtraKey  = EXTRA_KEYS.find(k => !draft[k]?.visible)

  const addColumn = () => {
    if (!nextExtraKey) return
    setDraft(d => ({ ...d, [nextExtraKey]: { label: '', visible: true } }))
  }

  return (
    <div style={{
      width: 380, flexShrink: 0,
      background: 'var(--bg-surface)', borderRadius: 12,
      border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', alignSelf: 'flex-start',
      position: 'sticky', top: '1rem',
    }}>
      {/* Başlık */}
      <div style={{
        padding: '0.85rem 1rem', borderBottom: '1px solid var(--border-medium)',
        background: 'var(--bg-main)', borderRadius: '12px 12px 0 0',
      }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <i className="bi bi-layout-three-columns" style={{ color: 'var(--primary)' }} />
          Sütun İsimleri
        </div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>{ambar} — ambara özel</div>
      </div>

      {/* İstatistik */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ flex: 1, textAlign: 'center', background: 'rgba(99,102,241,0.06)', borderRadius: 8, padding: '0.5rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{activeCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Aktif Ürün</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', background: 'rgba(22,163,74,0.06)', borderRadius: 8, padding: '0.5rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>{visibleCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Aktif Sütun</div>
        </div>
      </div>

      {/* Sütun yapılandırması */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Sütunlar
        </div>

        {isAdmin ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {/* Temel 7 sütun */}
              {BASE_HIST_FIELDS.filter(f => BASE_KEYS.includes(f.key)).map(f => {
                const cfg = draft[f.key] || { label: DEFAULT_LABELS[f.key], visible: true }
                const isCustom = cfg.label !== DEFAULT_LABELS[f.key]
                return (
                  <ColRow key={f.key} f={f} cfg={cfg} isCustom={isCustom}
                    onToggle={v => setField(f.key, 'visible', v)}
                    onLabel={v => setField(f.key, 'label', v)}
                    onReset={() => setField(f.key, 'label', DEFAULT_LABELS[f.key])}
                  />
                )
              })}

              {/* Aktif ekstra sütunlar */}
              {activeExtras.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: '0.3rem', marginBottom: '-0.1rem' }}>
                  EKLENEN SÜTUNLAR
                </div>
              )}
              {BASE_HIST_FIELDS.filter(f => EXTRA_KEYS.includes(f.key) && draft[f.key]?.visible).map(f => {
                const cfg = draft[f.key] || { label: '', visible: true }
                const isCustom = !!cfg.label && cfg.label !== DEFAULT_LABELS[f.key]
                return (
                  <ColRow key={f.key} f={f} cfg={cfg} isCustom={isCustom}
                    onToggle={v => setField(f.key, 'visible', v)}
                    onLabel={v => setField(f.key, 'label', v)}
                    onReset={null}
                    extraRemove
                  />
                )
              })}

              {/* Sütun Ekle */}
              {nextExtraKey && (
                <button
                  onClick={addColumn}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.45rem 0.65rem', borderRadius: 8,
                    border: '1px dashed var(--border-medium)',
                    background: 'none', cursor: 'pointer',
                    color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600,
                    marginTop: '0.2rem',
                  }}
                >
                  <i className="bi bi-plus-circle" />
                  Sütun Ekle
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.85rem' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: 8,
                  background: 'var(--primary)', color: '#fff',
                  border: 'none', fontSize: '0.83rem', fontWeight: 600,
                  cursor: 'pointer', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              {msg && (
                <span style={{ fontSize: '0.78rem', color: msg.includes('başarısız') ? '#dc2626' : '#16a34a' }}>
                  {msg}
                </span>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.83rem', color: 'var(--text-tertiary)' }}>
            Sütun yapılandırması için admin yetkisi gereklidir.
          </div>
        )}
      </div>

      {/* Alt ipucu */}
      <div style={{
        padding: '0.7rem 1rem', borderTop: '1px solid var(--border-light)',
        fontSize: '0.76rem', color: 'var(--text-tertiary)', textAlign: 'center',
      }}>
        <i className="bi bi-hand-index" style={{ marginRight: '0.3rem' }} />
        Geçmişi görmek için tablodaki bir ürüne tıklayın
      </div>
    </div>
  )
}

const thP = (align = 'center') => ({
  padding: '0.4rem 0.5rem', textAlign: align,
  color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap',
})

// ── Ana sayfa ─────────────────────────────────────────────────────────────────
export default function CostProductsPage() {
  const hasRole = useAuthStore(s => s.hasRole)
  const isAdmin = hasRole('admin')

  const [warehouses, setWarehouses]       = useState([])
  const [selectedAmbar, setSelectedAmbar] = useState('')
  const [products, setProducts]           = useState([])
  const [loading, setLoading]             = useState(false)
  const [showArchived, setShowArchived]   = useState(false)
  const [search, setSearch]               = useState('')
  const [error, setError]                 = useState('')

  const [newName, setNewName]   = useState('')
  const [newUnit, setNewUnit]   = useState('ADET')
  const [adding, setAdding]     = useState(false)
  const [addError, setAddError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [colLabels, setColLabels] = useState({})

  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    getWarehouses().then(ws => {
      setWarehouses(ws)
      if (ws.length > 0) {
        setSelectedAmbar(ws[0])
        getColumnLabels(ws[0]).then(setColLabels).catch(() => {})
      }
    })
  }, [])

  const reload = useCallback(async () => {
    if (!selectedAmbar) return
    setLoading(true)
    setError('')
    try {
      const rows = await getProductsWithStock(selectedAmbar, showArchived)
      setProducts(rows)
    } catch {
      setError('Ürünler yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [selectedAmbar, showArchived])

  useEffect(() => { reload() }, [reload])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleArchive = async (p) => {
    if (!await confirmDialog(`"${p.name}" arşivlensin mi?`)) return
    try { await archiveProduct(p.id); reload() }
    catch { setError('Arşivleme başarısız.') }
  }

  const handleRestore = async (p) => {
    try { await restoreProduct(p.id); reload() }
    catch { setError('Geri yükleme başarısız.') }
  }

  const handleImport = async () => {
    if (!await confirmDialog(`"${selectedAmbar}" ambarındaki tüm ERP ürünleri aktarılsın mı?`)) return
    setImporting(true)
    setImportMsg('')
    try {
      const res = await importProductsFromErp(selectedAmbar)
      setImportMsg(`${res.imported} ürün aktarıldı${res.skipped ? `, ${res.skipped} zaten vardı` : ''}.`)
      reload()
    } catch {
      setImportMsg('Aktarım başarısız.')
    } finally {
      setImporting(false)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim()) { setAddError('Ürün adı gerekli.'); return }
    setAdding(true)
    setAddError('')
    try {
      await createProduct({ name: newName.trim(), unit: newUnit.trim() || 'ADET', ambar: selectedAmbar })
      setNewName('')
      reload()
    } catch {
      setAddError('Ürün eklenemedi.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div style={{ padding: '1.5rem 1.75rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      {/* Sol kolon — tablo */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 900 }}>

        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Ürün Yönetimi</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Ambar ürünlerini görüntüle, düzenle ve arşivle</p>
          </div>
          <Link
            to="/cost/envanter"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'var(--bg-surface)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-medium)', borderRadius: 8,
              padding: '0.45rem 1rem', fontSize: '0.83rem', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <i className="bi bi-table" />
            Envanter Takip
          </Link>
        </div>

        {/* Ambar sekmeleri */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {warehouses.map(w => (
              <button
                key={w}
                onClick={() => {
                  setSelectedAmbar(w); setSearch(''); setSelectedProduct(null); setImportMsg('')
                  getColumnLabels(w).then(setColLabels).catch(() => {})
                }}
                style={{
                  padding: '0.4rem 0.9rem', borderRadius: 8, cursor: 'pointer',
                  fontSize: '0.83rem', fontWeight: 600,
                  background: selectedAmbar === w ? 'var(--primary)' : 'var(--bg-surface)',
                  color: selectedAmbar === w ? '#fff' : 'var(--text-secondary)',
                  border: selectedAmbar === w ? 'none' : '1px solid var(--border-medium)',
                  boxShadow: selectedAmbar === w ? 'var(--shadow-primary)' : 'none',
                }}
              >
                {w}
              </button>
            ))}
          </div>
          {isAdmin && products.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {importMsg && (
                <span style={{ fontSize: '0.78rem', color: importMsg.includes('başarısız') ? '#dc2626' : '#16a34a' }}>
                  {importMsg}
                </span>
              )}
              <button
                onClick={handleImport}
                disabled={importing}
                title="ERP transfer geçmişinden bu ambar için ürünleri otomatik aktar"
                style={{
                  padding: '0.4rem 0.85rem', borderRadius: 8, cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 600, opacity: importing ? 0.6 : 1,
                  background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)',
                  display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}
              >
                <i className="bi bi-cloud-download" />
                {importing ? 'Aktarılıyor…' : 'ERP\'den Aktar'}
              </button>
            </div>
          )}
        </div>

        {/* Arama + Arşiv toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <i className="bi bi-search" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: '0.8rem' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ürün ara…"
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: 8, border: '1px solid var(--border-medium)',
                background: 'var(--bg-surface)', color: 'var(--text-primary)',
                fontSize: '0.875rem', boxSizing: 'border-box',
              }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.83rem', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            Arşivleri göster
          </label>
        </div>

        {/* Hata */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', color: '#dc2626',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '0.6rem 1rem', marginBottom: '1rem', fontSize: '0.875rem',
          }}>
            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '0.4rem' }} />
            {error}
          </div>
        )}

        {/* Ürün tablosu */}
        <div style={{
          background: 'var(--bg-surface)', borderRadius: 12,
          border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden', marginBottom: '1.5rem',
        }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              <div style={{ width: 20, height: 20, border: '2px solid var(--border-medium)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem' }} />
              Yükleniyor…
            </div>
          ) : filteredProducts.length === 0 && !search ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>📦</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Bu ambarda henüz ürün eklenmemiş.
              </p>
              {isAdmin && (
                <>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    style={{
                      background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10,
                      padding: '0.65rem 1.75rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                      opacity: importing ? 0.7 : 1,
                    }}
                  >
                    <i className="bi bi-cloud-download-fill" style={{ marginRight: '0.4rem' }} />
                    {importing ? 'Aktarılıyor…' : 'ERP\'den Ürünleri Aktar'}
                  </button>
                  {importMsg && (
                    <p style={{ marginTop: '0.75rem', fontSize: '0.83rem', color: importMsg.includes('başarısız') ? '#dc2626' : '#16a34a' }}>
                      {importMsg}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
              Arama sonucu yok.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-medium)' }}>
                  <th style={th('left')}>Ürün Adı</th>
                  <th style={th()}>Birim</th>
                  <th style={th()}>Bölen</th>
                  <th style={th()}>Güncel Stok</th>
                  <th style={th()}>Son Giriş Tarihi</th>
                  {isAdmin && <th style={th()}>İşlemler</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const isArchived = !p.is_active
                  const isSelected = selectedProduct?.id === p.id
                  return (
                    <tr
                      key={p.id}
                      onClick={() => !isArchived && setSelectedProduct(isSelected ? null : p)}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        opacity: isArchived ? 0.55 : 1,
                        background: isSelected
                          ? 'rgba(99,102,241,0.07)'
                          : isArchived ? 'rgba(156,163,175,0.04)' : 'transparent',
                        cursor: isArchived ? 'default' : 'pointer',
                        transition: 'background 100ms',
                      }}
                    >
                      <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {isSelected && (
                          <i className="bi bi-caret-right-fill" style={{ marginRight: '0.35rem', color: 'var(--primary)', fontSize: '0.65rem' }} />
                        )}
                        {p.name}
                        {isArchived && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#9ca3af', background: 'rgba(156,163,175,0.12)', borderRadius: 4, padding: '1px 5px' }}>
                            arşiv
                          </span>
                        )}
                      </td>
                      <td style={tdCenter} onClick={e => e.stopPropagation()}>
                        <UnitCell product={p} onSaved={reload} />
                      </td>
                      <td style={tdCenter} onClick={e => e.stopPropagation()}>
                        {!isArchived
                          ? <DivisorCell product={p} onSaved={reload} />
                          : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.83rem' }}>÷{p.divisor || 1}</span>
                        }
                      </td>
                      <td style={{
                        ...tdCenter, fontWeight: 700,
                        color: p.kalan < 0 ? '#dc2626' : p.kalan > 0 ? '#16a34a' : 'var(--text-tertiary)',
                      }}>
                        {p.kalan != null ? p.kalan : '—'}
                      </td>
                      <td style={tdCenter}>{p.entry_date || '—'}</td>
                      {isAdmin && (
                        <td style={tdCenter} onClick={e => e.stopPropagation()}>
                          {isArchived ? (
                            <button
                              onClick={() => handleRestore(p)}
                              style={{
                                padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none',
                                background: 'rgba(22,163,74,0.1)', color: '#16a34a',
                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              <i className="bi bi-arrow-counterclockwise" style={{ marginRight: '0.25rem' }} />
                              Geri Yükle
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchive(p)}
                              style={{
                                padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none',
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              <i className="bi bi-archive-fill" style={{ marginRight: '0.25rem' }} />
                              Arşivle
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Yeni ürün ekle (sadece admin) */}
        {isAdmin && (
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 12,
            border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)',
            padding: '1.25rem',
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
              <i className="bi bi-plus-circle-fill" style={{ marginRight: '0.4rem', color: 'var(--primary)' }} />
              Yeni Ürün Ekle
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>
                → {selectedAmbar}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={lbl}>Ürün Adı</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder="Ürün adı"
                  style={inputCss}
                />
              </div>
              <div style={{ flex: '0 0 110px' }}>
                <label style={lbl}>Birim</label>
                <input
                  value={newUnit}
                  onChange={e => setNewUnit(e.target.value)}
                  placeholder="ADET"
                  style={inputCss}
                />
              </div>
              <div style={{ flex: '0 0 auto', alignSelf: 'flex-end' }}>
                <button
                  onClick={handleAdd}
                  disabled={adding || !newName.trim()}
                  style={{
                    background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '0 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    opacity: adding || !newName.trim() ? 0.6 : 1, height: 38,
                  }}
                >
                  {adding ? 'Ekleniyor…' : 'Ekle'}
                </button>
              </div>
            </div>
            {addError && (
              <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem' }}>{addError}</div>
            )}
          </div>
        )}
      </div>

      {/* Sağ panel */}
      {selectedProduct ? (
        <HistoryPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          colLabels={colLabels}
        />
      ) : (
        <WelcomePanel
          ambar={selectedAmbar}
          products={products}
          colLabels={colLabels}
          onLabelsChange={setColLabels}
          isAdmin={isAdmin}
        />
      )}

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

const tdCenter = {
  padding: '0.6rem 0.85rem', textAlign: 'center',
  color: 'var(--text-secondary)', fontSize: '0.855rem',
}

const lbl = {
  display: 'block', fontSize: '0.75rem',
  color: 'var(--text-tertiary)', marginBottom: '0.3rem',
}

const inputCss = {
  width: '100%', padding: '0.48rem 0.75rem', borderRadius: 8,
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-main)', color: 'var(--text-primary)',
  fontSize: '0.875rem', boxSizing: 'border-box',
}
