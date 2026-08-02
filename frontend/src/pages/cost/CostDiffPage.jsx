import { useState, useEffect, useCallback } from 'react'
import { getInventoryDiff, getColumnLabels } from '../../api/cost'

const DEFAULT_LABELS = {
  sevkiyat: 'Sevkiyat', sistem_cikisi: 'Sistem Çıkışı',
}

const todayStr = () => new Date().toISOString().slice(0, 10)

const THRESHOLD_OPTIONS = [10, 20, 50, 100, 200, 500]

export default function CostDiffPage() {
  const [dateStr, setDateStr]       = useState(todayStr())
  const [threshold, setThreshold]   = useState(50)
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [activeFilter, setActiveFilter] = useState(null) // null | 'low' | 'diff'
  const [allLabels, setAllLabels]   = useState({}) // { ambar: { col_key: label } }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setActiveFilter(null)
    try {
      const res = await getInventoryDiff(dateStr, threshold)
      setData(res)
    } catch {
      setError('Veri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }, [dateStr, threshold])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    getColumnLabels().then(setAllLabels).catch(() => {})
  }, [])

  const allItems = data?.items || []
  const visibleItems = activeFilter === 'low'  ? allItems.filter(i => i.is_low)
                     : activeFilter === 'diff' ? allItems.filter(i => i.has_diff)
                     : allItems

  // Group by ambar
  const grouped = visibleItems.reduce((acc, item) => {
    const key = item.ambar || 'Diğer'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  const totalLow  = (data?.items || []).filter(i => i.is_low).length
  const totalDiff = (data?.items || []).filter(i => i.has_diff).length

  return (
    <div style={{ padding: '1.5rem 1.75rem' }}>

      {/* Başlık */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 700 }}>Envanter Fark Analizi</h2>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
          Az stoklu ürünler ve sistem çıkışı ile sevkiyat uyuşmazlıkları
        </p>
      </div>

      {/* Kontroller */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            <i className="bi bi-calendar3" style={{ marginRight: '0.25rem' }} />Tarih
          </label>
          <input
            type="date"
            value={dateStr}
            max={todayStr()}
            onChange={e => setDateStr(e.target.value)}
            style={{
              padding: '0.45rem 0.6rem', borderRadius: 8,
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              fontSize: '0.875rem',
            }}
          />
          {dateStr !== todayStr() && (
            <button
              onClick={() => setDateStr(todayStr())}
              style={{
                padding: '0.45rem 0.7rem', borderRadius: 8,
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                fontSize: '0.8rem', cursor: 'pointer',
              }}
            >Bugün</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            <i className="bi bi-exclamation-triangle" style={{ marginRight: '0.25rem' }} />Az stok eşiği
          </label>
          <select
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            style={{
              padding: '0.45rem 0.6rem', borderRadius: 8,
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {THRESHOLD_OPTIONS.map(v => (
              <option key={v} value={v}>≤ {v}</option>
            ))}
          </select>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: '0.45rem 1rem', borderRadius: 8,
            border: '1px solid var(--border-medium)',
            background: 'var(--bg-surface)', color: 'var(--text-secondary)',
            fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <i className="bi bi-arrow-clockwise" style={{ marginRight: '0.3rem' }} />
          Yenile
        </button>
      </div>

      {/* Özet kartlar */}
      {data && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <SummaryCard
            icon="bi bi-box-seam"
            label="Az Stoklu Ürün"
            value={allItems.filter(i => i.is_low).length}
            color="#dc2626"
            bg="rgba(220,38,38,0.08)"
            active={activeFilter === 'low'}
            onClick={() => setActiveFilter(f => f === 'low' ? null : 'low')}
          />
          <SummaryCard
            icon="bi bi-arrow-left-right"
            label="Sevkiyat Uyuşmazlığı"
            value={allItems.filter(i => i.has_diff).length}
            color="#d97706"
            bg="rgba(217,119,6,0.08)"
            active={activeFilter === 'diff'}
            onClick={() => setActiveFilter(f => f === 'diff' ? null : 'diff')}
          />
          <SummaryCard
            icon="bi bi-check-circle"
            label="Tümü"
            value={allItems.length}
            color="#7c3aed"
            bg="rgba(124,58,237,0.08)"
            active={activeFilter === null}
            onClick={() => setActiveFilter(null)}
          />
        </div>
      )}

      {/* Hata */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', color: '#dc2626',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 8, padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.875rem',
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '0.4rem' }} />
          {error}
        </div>
      )}

      {/* İçerik */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', padding: '3rem 0', fontSize: '0.875rem' }}>
          <div style={{ width: 16, height: 16, border: '2px solid var(--border-medium)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          Yükleniyor...
        </div>
      ) : data?.items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 0',
          background: 'var(--bg-surface)', borderRadius: 12,
          border: '1px solid var(--border-medium)',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {dateStr} tarihinde sorunlu ürün bulunamadı.
          </p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '0.4rem' }}>
            Az stok eşiği: ≤ {threshold}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([ambar, items]) => (
          <AmbarSection key={ambar} ambar={ambar} items={items} threshold={threshold}
            labels={allLabels[ambar] || {}} />
        ))
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Özet kart ────────────────────────────────────────────────────────────────
function SummaryCard({ icon, label, value, color, bg, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: active ? color + '22' : bg,
        border: `${active ? 2 : 1}px solid ${active ? color : color + '33'}`,
        borderRadius: 10, padding: '0.75rem 1.25rem', minWidth: 160,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border 150ms, background 150ms',
        boxShadow: active ? `0 0 0 2px ${color}33` : 'none',
      }}
    >
      <i className={icon} style={{ fontSize: '1.4rem', color }} />
      <div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.75rem', color, opacity: 0.8, marginTop: '0.2rem' }}>{label}</div>
      </div>
    </div>
  )
}

// ── Ambar bölümü ──────────────────────────────────────────────────────────────
function AmbarSection({ ambar, items, threshold, labels }) {
  const lbl = (key, def) => labels[key]?.label || def
  const lowItems  = items.filter(i => i.is_low)
  const diffItems = items.filter(i => i.has_diff)

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '0.75rem',
      }}>
        <i className="bi bi-building" style={{ color: 'var(--primary)', fontSize: '0.9rem' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ambar}</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
          {lowItems.length} az stok · {diffItems.length} uyuşmazlık
        </span>
      </div>

      <div style={{
        background: 'var(--bg-surface)', borderRadius: 12,
        border: '1px solid var(--border-medium)', boxShadow: 'var(--shadow-sm)',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: '0.855rem', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 'auto' }} />
            <col style={{ width: 68 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 78 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-medium)' }}>
              <th style={th('left')}>Ürün</th>
              <th style={th()}>Birim</th>
              <th style={th()}>Mevcut</th>
              <th style={th()}>{lbl('sevkiyat', 'Sevkiyat')}</th>
              <th style={th()}>Sistem Çıkışı</th>
              <th style={th()}>Fark</th>
              <th style={th()}>Kalan</th>
              <th style={th()}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const isLow  = item.is_low
              const isDiff = item.has_diff
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.55rem 0.85rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product_name}
                  </td>
                  <td style={tdCenter}>{item.unit}</td>
                  <td style={tdCenter}>{item.mevcut ?? 0}</td>
                  <td style={tdCenter}>{item.sevkiyat || 0}</td>
                  <td style={tdCenter}>{item.sistem_cikisi || 0}</td>
                  <td style={{
                    ...tdCenter, fontWeight: 700,
                    color: isDiff ? (item.sevkiyat_fark > 0 ? '#dc2626' : '#d97706') : 'var(--text-tertiary)',
                  }}>
                    {isDiff ? (item.sevkiyat_fark > 0 ? '+' : '') + item.sevkiyat_fark : '—'}
                  </td>
                  <td style={{
                    ...tdCenter, fontWeight: 700,
                    color: item.kalan < 0 ? '#dc2626' : isLow ? '#d97706' : '#16a34a',
                    background: item.kalan < 0 ? 'rgba(220,38,38,0.06)' : isLow ? 'rgba(217,119,6,0.06)' : 'transparent',
                  }}>
                    {item.kalan}
                  </td>
                  <td style={{ ...tdCenter, gap: '0.3rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {isLow && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(220,38,38,0.1)', color: '#dc2626', whiteSpace: 'nowrap' }}>
                          Az Stok
                        </span>
                      )}
                      {isDiff && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(217,119,6,0.1)', color: '#d97706', whiteSpace: 'nowrap' }}>
                          Fark
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
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
  padding: '0.55rem 0.75rem', textAlign: 'center',
  color: 'var(--text-secondary)', fontSize: '0.855rem',
}
