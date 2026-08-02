import { confirmDialog } from '../store/dialogStore'
import { useState, useEffect, useCallback } from 'react'
import client from '../api/client'
import useAlarmStore from '../store/alarmStore'
import MultiSelect from '../components/ui/MultiSelect'

const cardStyle = {
  background: 'var(--bg-surface)', border: '1px solid var(--border-light)',
  borderRadius: 12, padding: '1.25rem',
}
const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', display: 'block',
}
const inputStyle = {
  width: '100%', padding: '0.55rem 0.8rem', border: '1.5px solid var(--border-medium)',
  borderRadius: 8, fontSize: '0.875rem', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
}
const btnPrimary = {
  padding: '0.55rem 1.2rem', background: 'var(--primary, #2563eb)', color: '#fff',
  border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
const btnSecondary = {
  padding: '0.55rem 1rem', background: 'transparent', color: 'var(--text-secondary)',
  border: '1.5px solid var(--border-medium)', borderRadius: 8, fontWeight: 600,
  fontSize: 14, cursor: 'pointer',
}
const thStyle = {
  padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left',
  borderBottom: '1px solid var(--border-medium)', background: 'var(--bg-main)',
  whiteSpace: 'nowrap',
}
const tdStyle = {
  padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-light)', verticalAlign: 'middle',
}

const BLANK_FORM = {
  name: '', metric: 'total_tutar', rule_type: 'threshold',
  comparison: 'lt', period: 'gun', threshold_value: '', iqr_multiplier: '1.5',
  ambar: [], giris_ambari: [], stok_adi: [], is_active: true,
}

const periodLabel = { gun: 'Gün', hafta: 'Hafta', ay: 'Ay' }
const metricLabel = { total_tutar: 'Ciro (TL)', miktar: 'Miktar (adet)' }
const cmpLabel = { lt: '< altına düşerse', gt: '> üstüne çıkarsa' }

function csvToArr(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  return val.split(',').map(v => v.trim()).filter(Boolean)
}
function arrToCsv(arr) {
  return arr.join(',') || null
}

function fmtVal(v) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  return isNaN(n) ? '—' : n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })
}

function RuleForm({ initial, onSave, onCancel, filterOptions }) {
  const [form, setForm] = useState(() => initial
    ? { ...initial, ambar: csvToArr(initial.ambar), giris_ambari: csvToArr(initial.giris_ambari), stok_adi: csvToArr(initial.stok_adi) }
    : BLANK_FORM
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!form.name.trim()) { setErr('Kural adı zorunlu'); return }
    if (form.rule_type === 'threshold' && !form.threshold_value) {
      setErr('Eşik değeri zorunlu'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        ambar: arrToCsv(form.ambar),
        giris_ambari: arrToCsv(form.giris_ambari),
        stok_adi: arrToCsv(form.stok_adi),
        threshold_value: form.threshold_value ? Number(form.threshold_value) : null,
        iqr_multiplier: Number(form.iqr_multiplier) || 1.5,
        is_active: form.is_active ? 1 : 0,
      }
      if (form.id) {
        await client.put(`/alarms/rules/${form.id}`, payload)
      } else {
        await client.post('/alarms/rules', payload)
      }
      onSave()
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const ambarOptions   = filterOptions?.cikis_ambari || []
  const girisOptions   = filterOptions?.giris_ambari || []
  const stokOptions    = filterOptions?.stok_adi     || []

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div>
        <label style={labelStyle}>Kural Adı</label>
        <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Örn: İstanbul Düşük Ciro" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Metrik</label>
          <select style={inputStyle} value={form.metric} onChange={e => set('metric', e.target.value)}>
            <option value="total_tutar">Ciro (TL)</option>
            <option value="miktar">Miktar (adet)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Periyot</label>
          <select style={inputStyle} value={form.period} onChange={e => set('period', e.target.value)}>
            <option value="gun">Gün</option>
            <option value="hafta">Hafta</option>
            <option value="ay">Ay</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={labelStyle}>Kural Tipi</label>
          <select style={inputStyle} value={form.rule_type} onChange={e => set('rule_type', e.target.value)}>
            <option value="threshold">Eşik (Sabit değer)</option>
            <option value="iqr">IQR Sapma</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Karşılaştırma</label>
          <select style={inputStyle} value={form.comparison} onChange={e => set('comparison', e.target.value)}>
            <option value="lt">Altına düşerse (&lt;)</option>
            <option value="gt">Üstüne çıkarsa (&gt;)</option>
          </select>
        </div>
      </div>
      {form.rule_type === 'threshold' ? (
        <div>
          <label style={labelStyle}>Eşik Değeri</label>
          <input style={inputStyle} type="number" value={form.threshold_value}
            onChange={e => set('threshold_value', e.target.value)} placeholder="Örn: 50000" />
        </div>
      ) : (
        <div>
          <label style={labelStyle}>IQR Çarpanı (varsayılan 1.5)</label>
          <input style={inputStyle} type="number" step="0.1" value={form.iqr_multiplier}
            onChange={e => set('iqr_multiplier', e.target.value)} />
        </div>
      )}
      <MultiSelect label="Çıkış Ambarı (opsiyonel — boş = tümü)" options={ambarOptions} value={form.ambar} onChange={v => set('ambar', v)} />
      <MultiSelect label="Giriş Ambarı / Şube (opsiyonel — boş = tümü)" options={girisOptions} value={form.giris_ambari} onChange={v => set('giris_ambari', v)} />
      <MultiSelect label="Stok Adı (opsiyonel — boş = tümü)" options={stokOptions} value={form.stok_adi} onChange={v => set('stok_adi', v)} />
      {err && <div style={{ color: '#ef4444', fontSize: 13 }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button type="button" style={btnSecondary} onClick={onCancel}>İptal</button>
        <button type="submit" style={btnPrimary} disabled={saving}>
          {saving ? 'Kaydediliyor…' : (form.id ? 'Güncelle' : 'Oluştur')}
        </button>
      </div>
    </form>
  )
}

function RulesTab({ filterOptions }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editRule, setEditRule] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await client.get('/alarms/rules')
      setRules(r.data.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(rule) {
    await client.post(`/alarms/rules/${rule.id}/toggle`)
    load()
  }

  async function handleDelete(rule) {
    if (!await confirmDialog(`"${rule.name}" kuralını silmek istiyor musunuz?`)) return
    await client.delete(`/alarms/rules/${rule.id}`)
    load()
  }

  function handleEdit(rule) { setEditRule(rule); setShowForm(true) }
  function handleAdd() { setEditRule(null); setShowForm(true) }
  function handleSaved() { setShowForm(false); setEditRule(null); load() }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Yükleniyor…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {showForm && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            {editRule ? 'Kuralı Düzenle' : 'Yeni Kural'}
          </div>
          <RuleForm initial={editRule} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditRule(null) }} filterOptions={filterOptions} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{rules.length} kural tanımlı</span>
        {!showForm && <button style={btnPrimary} onClick={handleAdd}>+ Yeni Kural</button>}
      </div>
      {rules.length === 0 ? (
        <div style={{ ...cardStyle, color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem' }}>
          Henüz alarm kuralı yok. "Yeni Kural" ile başlayın.
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Kural Adı</th>
                <th style={thStyle}>Metrik</th>
                <th style={thStyle}>Tip</th>
                <th style={thStyle}>Koşul</th>
                <th style={thStyle}>Periyot</th>
                <th style={thStyle}>Aktif</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => {
                const filterParts = [
                  r.ambar && `Çıkış: ${r.ambar}`,
                  r.giris_ambari && `Giriş: ${r.giris_ambari}`,
                  r.stok_adi && `Stok: ${r.stok_adi}`,
                ].filter(Boolean)
                return (
                  <tr key={r.id} style={{ opacity: r.is_active ? 1 : 0.5 }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {filterParts.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {filterParts.join(' · ')}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>{metricLabel[r.metric] || r.metric}</td>
                    <td style={tdStyle}>{r.rule_type === 'threshold' ? 'Eşik' : 'IQR'}</td>
                    <td style={tdStyle}>
                      {r.rule_type === 'threshold'
                        ? `${cmpLabel[r.comparison]} ${fmtVal(r.threshold_value)}`
                        : `Sapma ×${r.iqr_multiplier}`}
                    </td>
                    <td style={tdStyle}>{periodLabel[r.period] || r.period}</td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => handleToggle(r)}
                        style={{
                          width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                          background: r.is_active ? 'var(--primary, #2563eb)' : 'var(--border-medium)',
                          position: 'relative', transition: 'background 0.2s',
                        }}
                        title={r.is_active ? 'Devre dışı bırak' : 'Etkinleştir'}
                      >
                        <span style={{
                          position: 'absolute', top: 3, left: r.is_active ? 19 : 3,
                          width: 16, height: 16, borderRadius: '50%', background: '#fff',
                          transition: 'left 0.2s',
                        }} />
                      </button>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 6 }} onClick={() => handleEdit(r)}>Düzenle</button>
                      <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => handleDelete(r)}>Sil</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function LogsTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const setUnreadCount = useAlarmStore(s => s.setUnreadCount)
  const decrement = useAlarmStore(s => s.decrement)

  const load = useCallback(async (uo) => {
    setLoading(true)
    try {
      const r = await client.get(`/alarms/logs${uo ? '?unread=true' : ''}`)
      setLogs(r.data.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(unreadOnly) }, [load, unreadOnly])

  async function markAllRead() {
    await client.post('/alarms/logs/read-all')
    setUnreadCount(0)
    load(unreadOnly)
  }

  async function handleDeleteLog(l) {
    if (!await confirmDialog('Bu log kaydını silmek istiyor musunuz?')) return
    await client.delete(`/alarms/logs/${l.id}`)
    if (!l.is_read) decrement()
    load(unreadOnly)
  }

  function actualColor(l) {
    const actual = Number(l.actual_value)
    const expected = Number(l.expected_value)
    if (isNaN(actual) || isNaN(expected) || l.expected_value === null) return '#ef4444'
    return actual >= expected ? '#16a34a' : '#ef4444'
  }

  const unreadLogs = logs.filter(l => !l.is_read)

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Yükleniyor…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          style={{ ...btnSecondary, padding: '6px 14px', fontSize: 13, fontWeight: unreadOnly ? 700 : 600, borderColor: unreadOnly ? 'var(--primary)' : undefined, color: unreadOnly ? 'var(--primary)' : undefined }}
          onClick={() => setUnreadOnly(v => !v)}
        >
          {unreadOnly ? 'Tümünü Göster' : 'Sadece Okunmamış'}
        </button>
        {unreadLogs.length > 0 && (
          <button style={{ ...btnSecondary, padding: '6px 14px', fontSize: 13 }} onClick={markAllRead}>
            Tümünü Okundu İşaretle ({unreadLogs.length})
          </button>
        )}
      </div>
      {logs.length === 0 ? (
        <div style={{ ...cardStyle, color: 'var(--text-secondary)', textAlign: 'center', padding: '2.5rem' }}>
          {unreadOnly ? 'Okunmamış alarm yok.' : 'Henüz alarm tetiklenmedi.'}
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Tarih</th>
                <th style={thStyle}>Kural</th>
                <th style={thStyle}>Gerçek</th>
                <th style={thStyle}>Beklenen</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} style={{ background: l.is_read ? undefined : 'rgba(239,68,68,0.04)' }}>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', fontSize: 12 }}>{String(l.triggered_at).slice(0, 10)}</td>
                  <td style={{ ...tdStyle, fontWeight: 600, fontSize: 12 }}>{l.rule_name}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: actualColor(l), whiteSpace: 'nowrap' }}>{fmtVal(l.actual_value)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtVal(l.expected_value)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {!l.is_read && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 8 }} title="Okunmadı" />}
                    <button
                      onClick={() => handleDeleteLog(l)}
                      title="Kaydı sil"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px 4px', fontSize: 14, lineHeight: 1 }}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function AlarmsPage() {
  const [tab, setTab] = useState('rules')
  const [filterOptions, setFilterOptions] = useState({ cikis_ambari: [], giris_ambari: [], stok_adi: [] })
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const setUnreadCount = useAlarmStore(s => s.setUnreadCount)

  useEffect(() => {
    client.get('/filters').then(r => setFilterOptions(r.data)).catch(() => {})
  }, [])

  async function handleRun() {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await client.post('/alarms/run')
      const r = await client.get('/alarms/logs?unread=true')
      setUnreadCount(r.data?.count || 0)
      setRunResult(res.data)
    } catch (ex) {
      setRunResult({ error: ex.response?.data?.error || 'Hata oluştu' })
    } finally {
      setRunning(false)
    }
  }

  const tabStyle = (active) => ({
    padding: '0.55rem 1.25rem', fontWeight: active ? 700 : 600, fontSize: 14,
    border: 'none', background: 'none', cursor: 'pointer',
    color: active ? 'var(--primary, #2563eb)' : 'var(--text-secondary)',
    borderBottom: `2.5px solid ${active ? 'var(--primary, #2563eb)' : 'transparent'}`,
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Alarm Yönetimi</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0.35rem 0 0' }}>
            Eşik & sapma alarmları — kurallar tanımlayın, tetiklenen alarmları takip edin.
          </p>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            ...btnPrimary,
            background: running ? 'var(--border-medium)' : '#16a34a',
            display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
          }}
        >
          {running
            ? <><span className="loading-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Çalışıyor…</>
            : <><i className="bi bi-play-fill" /> Şimdi Çalıştır</>
          }
        </button>
      </div>
      {runResult && (
        <div style={{ ...cardStyle, marginBottom: '1rem', borderColor: runResult.error ? '#fca5a5' : 'var(--border-light)' }}>
          {runResult.error ? (
            <div style={{ color: '#ef4444', fontSize: 13 }}>{runResult.error}</div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: '0.75rem', color: runResult.triggered > 0 ? '#ef4444' : '#16a34a' }}>
                {runResult.triggered > 0 ? `⚠ ${runResult.triggered} alarm tetiklendi` : '✓ Tetiklenen alarm yok'}
                <button onClick={() => setRunResult(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14 }}>✕</button>
              </div>
              {runResult.details?.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, fontSize: 10, padding: '5px 8px' }}>Kural</th>
                      <th style={{ ...thStyle, fontSize: 10, padding: '5px 8px' }}>Filtre</th>
                      <th style={{ ...thStyle, fontSize: 10, padding: '5px 8px' }}>Dönem</th>
                      <th style={{ ...thStyle, fontSize: 10, padding: '5px 8px' }}>Hesaplanan Değer</th>
                      <th style={{ ...thStyle, fontSize: 10, padding: '5px 8px' }}>Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runResult.details.map((d, i) => (
                      <tr key={i} style={{ background: d.fired ? 'rgba(239,68,68,0.05)' : undefined }}>
                        <td style={{ ...tdStyle, padding: '5px 8px', fontWeight: 600 }}>{d.rule}</td>
                        <td style={{ ...tdStyle, padding: '5px 8px', color: 'var(--text-secondary)' }}>{d.filter}</td>
                        <td style={{ ...tdStyle, padding: '5px 8px', whiteSpace: 'nowrap' }}>{d.period}</td>
                        <td style={{ ...tdStyle, padding: '5px 8px', whiteSpace: 'nowrap' }}>{d.condition || '—'}</td>
                        <td style={{ ...tdStyle, padding: '5px 8px', whiteSpace: 'nowrap', color: d.fired ? '#ef4444' : d.status?.includes('yetersiz') ? '#f59e0b' : '#16a34a', fontWeight: 600 }}>
                          {d.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1.5px solid var(--border-light)', marginBottom: '1.25rem' }}>
        <button style={tabStyle(tab === 'rules')} onClick={() => setTab('rules')}>Kurallar</button>
        <button style={tabStyle(tab === 'logs')} onClick={() => setTab('logs')}>Geçmiş</button>
      </div>
      {tab === 'rules' ? <RulesTab filterOptions={filterOptions} /> : <LogsTab />}
    </div>
  )
}
