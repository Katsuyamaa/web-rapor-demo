import { confirmDialog } from '../store/dialogStore'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import client from '../api/client'
import useToastStore from '../store/toastStore'
import RoadmapTab from '../components/admin/RoadmapTab'
import TicketsTab from '../components/admin/TicketsTab'

/* ── Yardımcı bileşenler ── */
const Card = ({ title, children, style }) => (
  <section style={{
    background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
    borderRadius: '12px', padding: '1.5rem', ...style
  }}>
    {title && <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>{title}</h3>}
    {children}
  </section>
)

const Inp = ({ style, ...props }) => (
  <input style={{
    width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-medium)',
    borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg-surface)',
    color: 'var(--text-primary)', fontFamily: 'var(--sans)', boxSizing: 'border-box', ...style
  }} {...props} />
)

const Sel = ({ style, ...props }) => (
  <select style={{
    width: '100%', padding: '0.6rem 0.75rem', border: '1.5px solid var(--border-medium)',
    borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg-surface)',
    color: 'var(--text-primary)', fontFamily: 'var(--sans)', ...style
  }} {...props} />
)

const Btn = ({ variant = 'primary', style, ...props }) => {
  const base = {
    padding: '0.6rem 1.1rem', borderRadius: '8px', border: 'none',
    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--sans)', transition: 'opacity 150ms',
  }
  const styles = {
    primary: { background: 'linear-gradient(135deg,#2563eb,#06b6d4)', color: '#fff' },
    secondary: { background: 'var(--bg-surface)', color: 'var(--primary)', border: '1.5px solid var(--border-medium)' },
    danger: { background: '#fee2e2', color: '#b91c1c' },
  }
  return <button style={{ ...base, ...styles[variant], ...style }} {...props} />
}

const LOG_COLORS = { info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444' }
const LOG_ICONS  = { info: <i className="bi bi-info-circle-fill"></i>, success: <i className="bi bi-check-circle-fill"></i>, warning: <i className="bi bi-exclamation-triangle-fill"></i>, error: <i className="bi bi-x-circle-fill"></i> }

/* ══════════════════════════════════════════════════ */
const TABS = [
  { id: 'veri',        label: 'Veri',           icon: 'bi-cloud-download' },
  { id: 'veritabani',  label: 'Veritabanı',     icon: 'bi-database' },
  { id: 'loglar',      label: 'Loglar',         icon: 'bi-clipboard-data' },
  { id: 'kullanicilar',label: 'Kullanıcılar',   icon: 'bi-people-fill' },
  { id: 'sayfalar',    label: 'Sayfalar',       icon: 'bi-layout-text-sidebar' },
  { id: 'yapilacaklar',label: 'Yapılacaklar',   icon: 'bi-kanban' },
  { id: 'talepler',    label: 'Talepler',       icon: 'bi-ticket-perforated' },
]

export default function AdminPanel() {
  const [tab, setTab] = useState('veri')
  const [schedKey, setSchedKey] = useState(0)

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Yönetim Paneli</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Sistem yapılandırması, kullanıcı yönetimi ve veri operasyonları.</p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '0.25rem', flexWrap: 'wrap',
        borderBottom: '2px solid var(--border-medium)', marginBottom: '1.5rem',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '0.6rem 1.1rem', border: 'none', background: 'none',
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
            fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: '0.4rem',
            color: tab === t.id ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: '-2px', borderRadius: '0', transition: 'color 150ms',
          }}>
            <i className={`bi ${t.icon}`}></i> {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: tab === 'veri' ? 'flex' : 'none', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ flex: '1 1 calc(55% - 0.75rem)', minWidth: '300px' }}>
          <FetchSection onFetchSuccess={() => setSchedKey(k => k + 1)} />
        </div>
        <div style={{ flex: '1 1 calc(45% - 0.75rem)', minWidth: '280px' }}>
          <SchedulerSection schedKey={schedKey} />
        </div>
      </div>

      <div style={{ display: tab === 'veritabani' ? 'flex' : 'none', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ flex: '1 1 calc(50% - 0.75rem)', minWidth: '300px' }}>
          <MissingDaysSection />
        </div>
        <div style={{ flex: '1 1 calc(50% - 0.75rem)', minWidth: '300px' }}>
          <DatesSection />
        </div>
      </div>

      <div style={{ display: tab === 'loglar' ? 'block' : 'none' }}><LogSection /></div>
      <div style={{ display: tab === 'kullanicilar' ? 'block' : 'none' }}><UserSection /></div>
      <div style={{ display: tab === 'sayfalar' ? 'block' : 'none' }}><PageSection /></div>
      {tab === 'yapilacaklar' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem' }}>
          <RoadmapTab />
        </div>
      )}
      {tab === 'talepler' && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)', borderRadius: '12px', padding: '1.5rem' }}>
          <TicketsTab />
        </div>
      )}
    </div>
  )
}

/* ── ERP Veri Çekme ── */
function FetchSection({ onFetchSuccess }) {
  const today = new Date().toISOString().split('T')[0]
  const [start, setStart]     = useState(today)
  const [end, setEnd]         = useState(today)
  const [status, setStatus]   = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(null)
  const showToast = useToastStore(s => s.show)

  const fetchNow = async () => {
    setLoading(true); setStatus(''); setProgress(null)
    try {
      const { data } = await client.post('/admin/fetch_now', { start_date: start, end_date: end || start })
      setStatus(data.success ? '✅ ' + data.message : '❌ ' + data.error)
      if (data.success) { showToast(data.message, 'success'); onFetchSuccess?.() }
      else showToast(data.error || 'Hata', 'error')
    } catch { setStatus('❌ Bağlantı hatası.'); showToast('Bağlantı hatası.', 'error') }
    finally { setLoading(false) }
  }

  const fetchRange = async () => {
    const s = new Date(start), e = new Date(end || start)
    const days = Math.ceil((e - s) / 86400000) + 1
    if (days > 90 && !await confirmDialog(`${days} gün veri çekilecek. Devam?`)) return
    setLoading(true); setStatus('')
    const logs = []
    for (let i = 0; i < days; i++) {
      const d = new Date(s); d.setDate(s.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      setProgress({ current: i + 1, total: days, date: dateStr, logs: [...logs] })
      try {
        const { data } = await client.post('/admin/fetch_now', { start_date: dateStr, end_date: dateStr })
        logs.push({ date: dateStr, ok: data.success, msg: data.success ? (data.message || '✓') : (data.error || '✗') })
      } catch { logs.push({ date: dateStr, ok: false, msg: 'Bağlantı hatası' }) }
      await new Promise(r => setTimeout(r, 300))
    }
    setStatus(`Tamamlandı: ${logs.filter(l => l.ok).length}/${days} gün başarılı.`)
    setProgress(null); setLoading(false)
  }

  const cleanData = async () => {
    if (!await confirmDialog('Tüm ambar/şube/stok isimlerindeki ID önekleri temizlenecek (geri alınamaz). Devam?')) return
    setLoading(true); setStatus('')
    try {
      const { data } = await client.post('/clean_data')
      setStatus(data.success ? `✅ ${data.updated} satır güncellendi (toplam ${data.total})` : `❌ ${data.error}`)
      if (data.success) showToast(`${data.updated} satır güncellendi`, 'success')
      else showToast(data.error || 'Temizleme hatası.', 'error')
    } catch (e) {
      setStatus('❌ ' + (e.response?.data?.error || 'Temizleme hatası.'))
      showToast(e.response?.data?.error || 'Temizleme hatası.', 'error')
    } finally { setLoading(false) }
  }

  return (
    <Card title={<><i className="bi bi-cloud-download"></i> ERP Veri Çekme</>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Başlangıç</label>
          <Inp type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Bitiş</label>
          <Inp type="date" value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Btn onClick={fetchNow} disabled={loading} style={{ flex: 1 }}><i className="bi bi-download"></i> Tek Çek</Btn>
        <Btn variant="secondary" onClick={fetchRange} disabled={loading} style={{ flex: 1 }}><i className="bi bi-calendar-event"></i> Aralık Çek</Btn>
        <Btn variant="secondary" onClick={cleanData} disabled={loading} style={{ flex: 1 }}><i className="bi bi-eraser-fill"></i> İsimleri Temizle</Btn>
      </div>
      {progress && (
        <div style={{ marginBottom: '0.75rem', background: 'var(--bg-main)', borderRadius: '8px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span>{progress.current}/{progress.total} gün — {progress.date}</span>
            <span>{Math.round(progress.current / progress.total * 100)}%</span>
          </div>
          <div style={{ background: 'var(--border-medium)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(90deg,#2563eb,#06b6d4)', height: '100%', width: `${progress.current / progress.total * 100}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ maxHeight: '100px', overflowY: 'auto', marginTop: '0.5rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            {progress.logs.slice(-8).map((l, i) => (
              <div key={i} style={{ color: l.ok ? '#10b981' : '#ef4444' }}>{l.ok ? '✓' : '✗'} {l.date} — {l.msg}</div>
            ))}
          </div>
        </div>
      )}
      {status && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{status}</p>}
    </Card>
  )
}

/* ── Zamanlanmış Görevler ── */
function SchedulerSection({ schedKey }) {
  const [sched, setSched]               = useState({ enabled: false, hour: 2, minute: 0, interval_minutes: 0, last_run: '', last_status: '' })
  const [localHour, setLocalHour]       = useState(2)
  const [localMinute, setLocalMinute]   = useState(0)
  const [localInterval, setLocalInterval] = useState(0)
  const [jobStatus, setJobStatus]       = useState(null)
  const [countdown, setCountdown]       = useState(null)
  const [ordersSched, setOrdersSched]   = useState(null)
  const [ordersSchedLoading, setOSL]    = useState(false)
  const [runNowLoading, setRunNowLoading] = useState(false)
  const showToast = useToastStore(s => s.show)
  // ref tracks the committed sched so concurrent saveSched calls don't use stale state
  const schedRef = useRef(sched)

  const refreshSched = useCallback(async () => {
    try {
      const r = await client.get('/admin/scheduler')
      setSched(r.data)
      schedRef.current = r.data
      setLocalHour(r.data.hour ?? 2)
      setLocalMinute(r.data.minute ?? 0)
      setLocalInterval(r.data.interval_minutes ?? 0)
    } catch {}
  }, [])

  const refreshJobStatus = useCallback(async () => {
    try {
      const r = await client.get('/admin/scheduler-jobs')
      setJobStatus(r.data)
    } catch {}
  }, [])

  useEffect(() => {
    refreshSched()
    refreshJobStatus()
    client.get('/admin/orders-scheduler').then(r => setOrdersSched(r.data)).catch(() => {})
  }, [schedKey, refreshSched, refreshJobStatus])

  // poll job status every 30s
  useEffect(() => {
    const id = setInterval(refreshJobStatus, 30000)
    return () => clearInterval(id)
  }, [refreshJobStatus])

  // 1s countdown ticker — next_run_time arrives as ISO+03:00 so new Date() parses correctly
  useEffect(() => {
    const tick = () => {
      const erpJob = jobStatus?.jobs?.find(j => j.id === 'daily_fetch')
      if (!erpJob?.next_run_time) { setCountdown(null); return }
      const diff = Math.max(0, Math.round((new Date(erpJob.next_run_time) - Date.now()) / 1000))
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setCountdown(h > 0 ? `${h}s ${m}d ${s}sn` : m > 0 ? `${m}d ${s}sn` : `${s}sn`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [jobStatus])

  const saveSched = async (patch) => {
    const next = { ...schedRef.current, ...patch }
    setSched(next)
    schedRef.current = next  // update ref immediately so concurrent calls see latest
    try {
      await client.post('/admin/scheduler', {
        enabled: next.enabled,
        hour: next.hour,
        minute: next.minute,
        interval_minutes: next.interval_minutes,
      })
      const r = await client.get('/admin/scheduler')
      setSched(r.data)
      schedRef.current = r.data
      setLocalHour(r.data.hour ?? 2)
      setLocalMinute(r.data.minute ?? 0)
      setLocalInterval(r.data.interval_minutes ?? 0)
      refreshJobStatus()
    } catch {}
  }

  const runNow = async () => {
    setRunNowLoading(true)
    try {
      const { data } = await client.post('/admin/scheduler-run-now')
      if (data.success) {
        showToast('Scheduler çalıştırıldı', 'success')
        await refreshSched()
        refreshJobStatus()
      } else {
        showToast(data.error || 'Hata oluştu', 'error')
      }
    } catch (e) {
      showToast(e.response?.data?.error || 'Bağlantı hatası', 'error')
    } finally {
      setRunNowLoading(false)
    }
  }

  const isIntervalMode = sched.interval_minutes > 0

  return (
    <>
      <Card title={<><i className="bi bi-clock"></i> Zamanlanmış Görev</>} style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          ERP verisini otomatik çeker. Günlük (saat) veya aralıklı (dakika) modda çalışır.
          Aralıklı modda her çekimde o günün verisi <b>silinip yenisi yazılır</b>.
        </p>

        {/* Mod seçimi */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            onClick={() => { setLocalInterval(0); saveSched({ interval_minutes: 0 }) }}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: 6, border: '1.5px solid var(--border-medium)',
              background: !isIntervalMode ? 'var(--primary)' : 'var(--bg-surface)',
              color: !isIntervalMode ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            <i className="bi bi-calendar-check"></i> Günlük
          </button>
          <button
            onClick={() => {
              const iv = sched.interval_minutes > 0 ? sched.interval_minutes : 10
              setLocalInterval(iv)
              saveSched({ interval_minutes: iv })
            }}
            style={{
              padding: '0.35rem 0.85rem', borderRadius: 6, border: '1.5px solid var(--border-medium)',
              background: isIntervalMode ? 'var(--primary)' : 'var(--bg-surface)',
              color: isIntervalMode ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            <i className="bi bi-arrow-repeat"></i> Aralıklı
          </button>
        </div>

        {/* Günlük mod */}
        {!isIntervalMode && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <Inp type="number" min={0} max={23} value={localHour} style={{ width: '80px', textAlign: 'center' }}
              onChange={e => setLocalHour(+e.target.value)}
              onBlur={() => saveSched({ hour: localHour })}
              onKeyDown={e => e.key === 'Enter' && saveSched({ hour: localHour })}
              placeholder="Saat" />
            <span style={{ fontWeight: 700 }}>:</span>
            <Inp type="number" min={0} max={59} value={localMinute} style={{ width: '80px', textAlign: 'center' }}
              onChange={e => setLocalMinute(+e.target.value)}
              onBlur={() => saveSched({ minute: localMinute })}
              onKeyDown={e => e.key === 'Enter' && saveSched({ minute: localMinute })}
              placeholder="Dakika" />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={sched.enabled} onChange={e => saveSched({ enabled: e.target.checked })} /> Aktif
            </label>
          </div>
        )}

        {/* Aralıklı mod */}
        {isIntervalMode && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Her</span>
            <Inp type="number" min={1} max={1440} value={localInterval} style={{ width: '80px', textAlign: 'center' }}
              onChange={e => setLocalInterval(Math.max(1, +e.target.value))}
              onKeyDown={e => e.key === 'Enter' && saveSched({ interval_minutes: localInterval })} />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>dakikada bir</span>
            <button
              onClick={() => saveSched({ interval_minutes: localInterval })}
              style={{ padding: '0.3rem 0.7rem', borderRadius: 6, border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
            >Kaydet</button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={sched.enabled} onChange={e => saveSched({ enabled: e.target.checked })} /> Aktif
            </label>
          </div>
        )}

        <div style={{ fontSize: '0.8rem', background: 'var(--bg-main)', padding: '0.6rem 0.75rem', borderRadius: '8px', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          <b>Son çalışma:</b> {sched.last_run ? String(sched.last_run).slice(0, 16).replace('T', ' ') : '—'}<br />
          <b>Son sonuç:</b> {sched.last_status || '—'}
        </div>

        {/* APScheduler job durumu */}
        {jobStatus !== null && (() => {
          const erpJob = jobStatus.jobs?.find(j => j.id === 'daily_fetch')
          const isRunning = jobStatus.running
          const hasJob = !!erpJob
          const nextFire = erpJob?.next_run_time
            ? new Date(erpJob.next_run_time).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
            : null
          return (
            <div style={{
              fontSize: '0.78rem', padding: '0.45rem 0.75rem', borderRadius: '8px',
              marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: !isRunning ? '#fee2e2' : hasJob ? '#dcfce7' : '#fef9c3',
              color: !isRunning ? '#b91c1c' : hasJob ? '#166534' : '#713f12',
              border: `1px solid ${!isRunning ? '#fca5a5' : hasJob ? '#86efac' : '#fde047'}`,
            }}>
              <span style={{ fontSize: '0.9rem' }}>{!isRunning ? '🔴' : hasJob ? '🟢' : '🟡'}</span>
              {!isRunning
                ? 'APScheduler çalışmıyor — uygulamayı yeniden başlatın'
                : hasJob
                  ? <>İş kayıtlı · {nextFire || '?'} · <b style={{ fontVariantNumeric: 'tabular-nums' }}>{countdown ?? '...'}</b> sonra</>
                  : 'İş kayıtlı değil — Aktif kutusunu işaretleyip kaydedin'
              }
            </div>
          )
        })()}

        <button
          onClick={runNow}
          disabled={runNowLoading}
          style={{
            width: '100%', padding: '0.55rem', borderRadius: 8,
            background: runNowLoading ? 'var(--bg-main)' : '#fef3c7',
            color: runNowLoading ? 'var(--text-tertiary)' : '#92400e',
            border: '1.5px solid #fcd34d', fontWeight: 700, fontSize: '0.85rem',
            cursor: runNowLoading ? 'not-allowed' : 'pointer', opacity: runNowLoading ? 0.7 : 1,
          }}
        >
          {runNowLoading ? '⏳ Çalışıyor...' : '▶ Şimdi Çalıştır (Geçici)'}
        </button>
      </Card>

      {ordersSched !== null && (
        <Card title={<><i className="bi bi-arrow-repeat"></i> Sipariş Scheduler (F3003)</>}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={ordersSched.enabled}
                onChange={e => setOrdersSched(s => ({ ...s, enabled: e.target.checked }))} />
              Aktif
            </label>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Interval (dk)</div>
              <input type="number" min={1} max={60} value={ordersSched.interval_minutes}
                onChange={e => setOrdersSched(s => ({ ...s, interval_minutes: Number(e.target.value) }))}
                style={{ width: 70, padding: '0.4rem 0.6rem', border: '1.5px solid var(--border-medium)', borderRadius: 6, fontSize: '0.875rem', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Kesim Saati</div>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <input type="number" min={0} max={23} value={ordersSched.cutoff_hour}
                  onChange={e => setOrdersSched(s => ({ ...s, cutoff_hour: Number(e.target.value) }))}
                  style={{ width: 55, padding: '0.4rem 0.6rem', border: '1.5px solid var(--border-medium)', borderRadius: 6, fontSize: '0.875rem', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                <span style={{ color: 'var(--text-secondary)' }}>:</span>
                <input type="number" min={0} max={59} value={ordersSched.cutoff_minute}
                  onChange={e => setOrdersSched(s => ({ ...s, cutoff_minute: Number(e.target.value) }))}
                  style={{ width: 55, padding: '0.4rem 0.6rem', border: '1.5px solid var(--border-medium)', borderRadius: 6, fontSize: '0.875rem', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <button disabled={ordersSchedLoading}
              onClick={async () => {
                setOSL(true)
                try { await client.post('/admin/orders-scheduler', ordersSched); const r = await client.get('/admin/orders-scheduler'); setOrdersSched(r.data) } catch {}
                setOSL(false)
              }}
              style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: ordersSchedLoading ? 'not-allowed' : 'pointer', opacity: ordersSchedLoading ? 0.7 : 1 }}>
              {ordersSchedLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={async () => { try { await client.post('/admin/orders-fetch-now'); const r = await client.get('/admin/orders-scheduler'); setOrdersSched(r.data) } catch {} }}
              style={{ padding: '0.5rem 1rem', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1.5px solid var(--border-medium)', borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Şimdi Çalıştır
            </button>
          </div>
          {ordersSched.last_run && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Son çalışma: {String(ordersSched.last_run).slice(0, 16)} — {ordersSched.last_status}
            </div>
          )}
        </Card>
      )}
    </>
  )
}

const PERMISSIONS = [
  { key: 'ciro_karsilastirma', label: 'Ciro Karşılaştırması' },
  { key: 'filtreler',          label: 'Filtreler' },
  { key: 'cost',               label: 'Cost' },
  { key: 'gelistirme',         label: 'Geliştirme Sürecinde' },
]

/* ── Kullanıcı Yönetimi ── */
function UserSection() {
  const [users, setUsers]     = useState([])
  const [editing, setEditing] = useState(null)
  const [editPerms, setEditPerms] = useState([])
  const [newU, setNewU]       = useState({ username: '', password: '', role: 'user' })
  const [msg, setMsg]         = useState('')
  const [shownPw, setShownPw] = useState({})

  const load = useCallback(() => client.get('/users').then(r => setUsers(r.data.data || [])), [])
  useEffect(() => { load() }, [load])

  const startEdit = async (u) => {
    setEditing({ ...u, password: '' })
    try {
      const r = await client.get(`/users/${u.id}/permissions`)
      setEditPerms(r.data.permissions || [])
    } catch { setEditPerms([]) }
  }

  const create = async () => {
    if (!newU.username || !newU.password) { setMsg('❌ Boş bırakmayın.'); return }
    try {
      await client.post('/users', newU)
      setNewU({ username: '', password: '', role: 'user' }); setMsg('✅ Kullanıcı eklendi.'); load()
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'Hata')) }
  }

  const del = async (id, name) => {
    if (!await confirmDialog(`"${name}" silinsin mi?`)) return
    try {
      await client.delete(`/users/${id}`)
      load()
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'Silme hatası')) }
  }

  const update = async () => {
    try {
      await client.put(`/users/${editing.id}`, editing)
      await client.put(`/users/${editing.id}/permissions`, { permissions: editPerms })
      setEditing(null); load()
    } catch (e) { alert(e.response?.data?.error || 'Güncelleme hatası') }
  }

  const roleIcon = r => r === 'admin' ? <i className="bi bi-key-fill"></i> : r === 'user' ? <i className="bi bi-person-fill"></i> : <i className="bi bi-eye-fill"></i>

  return (
    <Card title={<><i className="bi bi-people-fill"></i> Kullanıcı Yönetimi</>}>
      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-medium)', borderRadius: '8px', marginBottom: '1.25rem' }}>
        {users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border-medium)', gap: '0.5rem' }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: '0.9rem' }}>{roleIcon(u.role)} <b>{u.username}</b> <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>({u.role})</span></span>
              <div style={{ fontSize: '0.78rem', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Şifre:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  {shownPw[u.id] ? (u.password_plain || '—') : '••••••'}
                </span>
                <button onClick={() => setShownPw(p => ({ ...p, [u.id]: !p[u.id] }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '0 2px', fontSize: '0.8rem' }}>
                  <i className={`bi bi-eye${shownPw[u.id] ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
              <Btn variant="secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => startEdit(u)}>Düzenle</Btn>
              <Btn variant="danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => del(u.id, u.username)}>Sil</Btn>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ background: 'var(--bg-main)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--border-medium)' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Kullanıcı Düzenle: {editing.username}</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Inp value={editing.username} onChange={e => setEditing(p => ({...p, username: e.target.value}))} placeholder="Kullanıcı adı" />
            <Inp type="password" value={editing.password} onChange={e => setEditing(p => ({...p, password: e.target.value}))} placeholder="Yeni şifre (boş = değiştirme)" />
            <Sel value={editing.role} onChange={e => setEditing(p => ({...p, role: e.target.value}))}>
              <option value="guest">Misafir</option>
              <option value="user">Kullanıcı</option>
              <option value="admin">Admin</option>
            </Sel>
            <div style={{ border: '1px solid var(--border-medium)', borderRadius: '6px', padding: '0.6rem 0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sidebar İzinleri {editing.role === 'admin' && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Admin her şeyi görür)</span>}
              </div>
              {PERMISSIONS.map(p => (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.3rem', cursor: editing.role === 'admin' ? 'default' : 'pointer', opacity: editing.role === 'admin' ? 0.5 : 1 }}>
                  <input
                    type="checkbox"
                    disabled={editing.role === 'admin'}
                    checked={editing.role === 'admin' ? true : editPerms.includes(p.key)}
                    onChange={e => setEditPerms(prev => e.target.checked ? [...prev, p.key] : prev.filter(x => x !== p.key))}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Btn onClick={update} style={{ flex: 1 }}>Güncelle</Btn>
              <Btn variant="secondary" onClick={() => setEditing(null)} style={{ flex: 1 }}>İptal</Btn>
            </div>
          </div>
        </div>
      )}

      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Yeni Kullanıcı</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <Inp value={newU.username} onChange={e => setNewU(p => ({...p, username: e.target.value}))} placeholder="Kullanıcı adı" />
        <Inp type="password" value={newU.password} onChange={e => setNewU(p => ({...p, password: e.target.value}))} placeholder="Şifre" />
        <Sel value={newU.role} onChange={e => setNewU(p => ({...p, role: e.target.value}))}>
          <option value="guest">Misafir</option>
          <option value="user">Kullanıcı</option>
          <option value="admin">Admin</option>
        </Sel>
        <Btn onClick={create}>Ekle</Btn>
      </div>
      {msg && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: msg.startsWith('✅') ? '#10b981' : '#ef4444' }}>{msg}</p>}
    </Card>
  )
}

/* ── Sistem Logları ── */
function LogSection() {
  const [logs, setLogs]       = useState([])
  const [typeF, setTypeF]     = useState('')
  const [catF, setCatF]       = useState('')
  const [dateF, setDateF]     = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: 200 })
    if (typeF) params.append('type', typeF)
    if (catF) params.append('category', catF)
    if (dateF) params.append('date', dateF)
    const { data } = await client.get('/admin/logs?' + params)
    setLogs(data.data || [])
  }, [typeF, catF, dateF])

  useEffect(() => { load() }, [load])

  const clearOld = async () => {
    if (!await confirmDialog('30 günden eski loglar silinecek.')) return
    await client.post('/admin/logs/clear', { days: 30 }); load()
  }

  const download = async () => {
    const { data } = await client.get('/admin/logs?limit=1000')
    const lines = (data.data || []).map(l => `[${l.created_at}] [${l.log_type.toUpperCase()}] [${l.category}] ${l.message}`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `sistem-log-${new Date().toISOString().slice(0,10)}.txt`; a.click()
  }

  return (
    <Card title={<><i className="bi bi-clipboard-data"></i> Sistem Logları</>} style={{ marginTop: '0' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <Sel value={typeF} onChange={e => setTypeF(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Tüm Tipler</option>
          <option value="info">Bilgi</option>
          <option value="success">Başarılı</option>
          <option value="warning">Uyarı</option>
          <option value="error">Hata</option>
        </Sel>
        <Sel value={catF} onChange={e => setCatF(e.target.value)} style={{ width: 'auto' }}>
          <option value="">Tüm Kategoriler</option>
          {['system','data','admin','auth','dashboard','nav','widget'].map(c => <option key={c} value={c}>{c}</option>)}
        </Sel>
        <Inp type="date" value={dateF} onChange={e => setDateF(e.target.value)} style={{ width: 'auto' }} />
        <Btn variant="secondary" style={{ padding: '0.5rem 0.75rem' }} onClick={download}>⬇️ İndir</Btn>
        <Btn variant="danger" style={{ padding: '0.5rem 0.75rem' }} onClick={clearOld}><i className="bi bi-trash3-fill"></i> Eski Temizle</Btn>
      </div>
      <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-medium)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)', position: 'sticky', top: 0 }}>
              {['Tip','Kategori','Mesaj','Kullanıcı','IP','Tarih'].map(h => (
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-medium)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Log bulunamadı</td></tr>
            )}
            {logs.map((log, i) => {
              const c = LOG_COLORS[log.log_type] || '#64748b'
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-medium)' }}>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <span style={{ background: c + '20', color: c, padding: '0.2rem 0.45rem', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700 }}>
                      {LOG_ICONS[log.log_type]} {log.log_type}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{log.category}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{log.message}</div>
                    {log.details && <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>{log.details}</div>}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-tertiary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{log.username || '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-tertiary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{log.ip_address || '—'}</td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-tertiary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ── Eksik Günler ── */
function MissingDaysSection() {
  const [dates, setDates]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(null)
  const showToast = useToastStore(s => s.show)

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/admin/available-dates')
      if (data.success) setDates(data.data || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const missingDays = useMemo(() => {
    if (dates.length === 0) return []
    const existingSet = new Set(dates.map(d => d.tarih))
    const minDateStr = dates[dates.length - 1].tarih // dates DESC → son eleman en eski
    const nowTR = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
    const todayStr = `${nowTR.getFullYear()}-${String(nowTR.getMonth() + 1).padStart(2, '0')}-${String(nowTR.getDate()).padStart(2, '0')}`
    const missing = []
    const cur = new Date(minDateStr + 'T00:00:00')
    const end = new Date(todayStr + 'T00:00:00')
    while (cur <= end) {
      const y = cur.getFullYear()
      const m = String(cur.getMonth() + 1).padStart(2, '0')
      const d = String(cur.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${d}`
      if (!existingSet.has(dateStr)) missing.push(dateStr)
      cur.setDate(cur.getDate() + 1)
    }
    return missing.reverse() // en yeni önce
  }, [dates])

  const fetchDate = async (dateStr) => {
    setFetching(dateStr)
    try {
      const { data } = await client.post('/admin/fetch_now', { start_date: dateStr, end_date: dateStr })
      if (data.success) { showToast(`${dateStr} çekildi`, 'success'); load() }
      else showToast(data.error || 'Hata', 'error')
    } catch { showToast('Bağlantı hatası', 'error') }
    finally { setFetching(null) }
  }

  const fetchAll = async () => {
    if (!missingDays.length || !await confirmDialog(`${missingDays.length} eksik gün sırayla çekilecek. Devam?`)) return
    setLoading(true)
    for (const d of [...missingDays].reverse()) { // en eski önce
      setFetching(d)
      try {
        await client.post('/admin/fetch_now', { start_date: d, end_date: d })
        await new Promise(r => setTimeout(r, 350))
      } catch {}
    }
    setFetching(null)
    setLoading(false)
    load()
    showToast('Tamamlandı', 'success')
  }

  return (
    <Card title="⚠️ Eksik Günler">
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>
          {dates.length === 0
            ? 'Veritabanında veri yok'
            : missingDays.length === 0 ? 'Eksik gün yok' : `${missingDays.length} eksik gün`}
        </span>
        <Btn variant="secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }} onClick={load}>↺ Yenile</Btn>
        {missingDays.length > 0 && (
          <Btn style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }} onClick={fetchAll} disabled={loading}>
            <i className="bi bi-download"></i> Tümünü Çek
          </Btn>
        )}
      </div>
      <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-medium)', borderRadius: '8px' }}>
        {missingDays.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            {dates.length === 0 ? 'Veritabanında henüz veri yok.' : 'Tüm günler eksiksiz.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', position: 'sticky', top: 0 }}>
                {['Tarih', 'Gün', ''].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: h === '' ? 'right' : 'left', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-medium)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {missingDays.map(dateStr => {
                const d = new Date(dateStr + 'T00:00:00')
                const dayName = d.toLocaleDateString('tr-TR', { weekday: 'long' })
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <tr key={dateStr} style={{ borderBottom: '1px solid var(--border-medium)', background: isWeekend ? 'rgba(99,102,241,0.04)' : undefined }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>{dateStr}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: isWeekend ? 'var(--text-tertiary)' : 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {dayName}{isWeekend && <span style={{ marginLeft: '0.3rem', fontSize: '0.72rem', color: '#a78bfa' }}>(hf)</span>}
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>
                      <button
                        onClick={() => fetchDate(dateStr)}
                        disabled={fetching === dateStr || loading}
                        style={{ background: 'none', border: '1px solid var(--border-medium)', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '5px', opacity: (fetching === dateStr || loading) ? 0.5 : 1 }}
                      >
                        {fetching === dateStr ? '...' : 'Çek'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

/* ── Sayfa / Bölüm Yönetimi ── */
function PageSection() {
  const [pages, setPages]   = useState([])
  const [title, setTitle]   = useState('')
  const [icon, setIcon]     = useState('📄')
  const [msg, setMsg]       = useState('')

  // Edit states
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editIcon, setEditIcon]   = useState('')

  // Drag & Drop states
  const [dragOverId, setDragOverId] = useState(null)

  const load = useCallback(() => {
    client.get('/pages/tree').then(r => {
      setPages((r.data.data || []).filter(p => p.slug !== 'home'))
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const create = async () => {
    if (!title.trim()) { setMsg('❌ Başlık zorunlu'); return }
    try {
      const maxOrder = pages.filter(p => !p.parent_id).reduce((max, p) => Math.max(max, p.sort_order || 0), 0)
      await client.post('/pages', { title: title.trim(), icon, page_type: 'page' })
      // New pages get depth 0. We could set sort_order but backend defaults to 0. 
      // User can sort them later.
      setTitle(''); setMsg('✅ Sayfa oluşturuldu.'); load()
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'Hata')) }
  }

  const del = async (id, name) => {
    if (!await confirmDialog(`"${name}" sayfası ve tüm alt sayfaları/widget'ları silinecek. Emin misiniz?`)) return
    try {
      await client.delete(`/pages/${id}`)
      load()
    } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'Silme hatası')) }
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditTitle(p.title)
    setEditIcon(p.icon || '📄')
  }

  const saveEdit = async () => {
    if (!editTitle.trim()) return
    try {
      await client.put(`/pages/${editingId}`, {
        title: editTitle.trim(),
        icon: editIcon
      })
      setEditingId(null)
      load()
    } catch (e) {
      alert('Hata: ' + (e.response?.data?.error || e.message))
    }
  }

  const moveOrder = async (p, direction) => {
    // direction: -1 (up), 1 (down)
    const siblings = pages.filter(x => x.parent_id === p.parent_id).sort((a,b) => (a.sort_order||0) - (b.sort_order||0))
    const idx = siblings.findIndex(x => x.id === p.id)
    if (idx === -1) return
    if (direction === -1 && idx === 0) return // Zaten en üstte
    if (direction === 1 && idx === siblings.length - 1) return // Zaten en altta
    
    const target = siblings[idx + direction]
    const currentOrder = p.sort_order || 0
    const targetOrder = target.sort_order || 0
    
    // Swap orders
    // If they are the same (e.g. both 0), we need to rewrite all siblings' orders to ensure consistency
    try {
      if (currentOrder === targetOrder) {
        // Rewrite all siblings
        const updates = []
        for (let i = 0; i < siblings.length; i++) {
          let newOrder = i * 10
          if (i === idx) newOrder = (idx + direction) * 10
          else if (i === idx + direction) newOrder = idx * 10
          updates.push({ id: siblings[i].id, sort_order: newOrder })
        }
        await client.put('/pages/bulk_reorder', updates)
      } else {
        await client.put('/pages/bulk_reorder', [
          { id: p.id, sort_order: targetOrder },
          { id: target.id, sort_order: currentOrder }
        ])
      }
      load()
    } catch (e) {
      alert("Sıralama hatası")
    }
  }

  // --- Drag & Drop ---
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('page_id', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) setDragOverId(id)
  }

  const handleDrop = async (e, targetParentId) => {
    e.preventDefault()
    setDragOverId(null)
    const draggedId = parseInt(e.dataTransfer.getData('page_id'))
    if (!draggedId || draggedId === targetParentId) return

    // Döngüsel ebeveyn kontrolü (Sayfayı kendi alt sayfasına atamayı engelle)
    let current = targetParentId ? pages.find(p => p.id === targetParentId) : null
    while (current) {
      if (current.id === draggedId) {
        alert("❌ Bir sayfayı kendi alt sayfasına taşıyamazsınız.")
        return
      }
      current = pages.find(p => p.id === current.parent_id)
    }

    try {
      // Hedefin (yeni parent) çocuklarının sayısını bulup sort_order'ı en sona atayalım
      const children = pages.filter(p => p.parent_id === targetParentId)
      const maxOrder = children.reduce((max, p) => Math.max(max, p.sort_order || 0), 0)
      
      await client.put(`/pages/${draggedId}`, { 
        parent_id: targetParentId,
        sort_order: maxOrder + 10
      })
      load()
    } catch (e) {
      alert('Taşıma hatası: ' + (e.response?.data?.error || e.message))
    }
  }

  // Rekürsif ağaç render fonksiyonu
  const renderTree = (parentId, depth = 0) => {
    const children = pages
      .filter(p => p.parent_id === parentId)
      .sort((a,b) => (a.sort_order||0) - (b.sort_order||0))
    
    if (children.length === 0) return null

    return children.map((p, idx) => {
      const isFirst = idx === 0
      const isLast = idx === children.length - 1
      
      return (
        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: depth === 0 && idx > 0 ? '0.4rem' : '0' }}>
          <div 
            draggable
            onDragStart={(e) => handleDragStart(e, p.id)}
            onDragOver={(e) => handleDragOver(e, p.id)}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => handleDrop(e, p.id)}
            style={{
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
              padding: '0.55rem 0.75rem', borderRadius: '8px',
              border: dragOverId === p.id ? '2px dashed #3b82f6' : '1px solid var(--border-medium)', 
              background: dragOverId === p.id ? 'rgba(59,130,246,0.1)' : 'var(--bg-main)',
              marginLeft: `${depth * 1.5}rem`,
              transition: 'all 0.2s',
              boxShadow: dragOverId === p.id ? '0 0 0 4px rgba(59,130,246,0.2)' : 'none',
              position: 'relative'
            }}
          >
            {/* Drag Handle & Content */}
            {editingId === p.id ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Inp value={editIcon} onChange={e => setEditIcon(e.target.value)} style={{ width: '50px' }} />
                <Inp value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ flex: 1, minWidth: '120px' }} />
                <Btn onClick={saveEdit} style={{ padding: '0.4rem 0.75rem' }}>Kaydet</Btn>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>İptal</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ cursor: 'grab', color: 'var(--text-tertiary)', fontSize: '1.2rem', userSelect: 'none' }} title="Sürükle bırak ile içine taşı"><i className="bi bi-grip-vertical"></i></span>
                <span style={{ fontSize: '1.1rem' }}>{p.icon || '📄'}</span>
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {p.title}
                </span>
                
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'monospace', marginRight: '0.5rem' }}>/p/{p.slug}</span>
                
                {/* Sorting Arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '0.5rem' }}>
                  <button onClick={() => moveOrder(p, -1)} disabled={isFirst} style={{ background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', opacity: isFirst ? 0.3 : 1, padding: 0, fontSize: '0.8rem', lineHeight: 1 }}>▲</button>
                  <button onClick={() => moveOrder(p, 1)} disabled={isLast} style={{ background: 'none', border: 'none', cursor: isLast ? 'default' : 'pointer', opacity: isLast ? 0.3 : 1, padding: 0, fontSize: '0.8rem', lineHeight: 1 }}>▼</button>
                </div>
                
                <button
                  onClick={() => startEdit(p)}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem 0.4rem', borderRadius: '4px' }}
                  title="Düzenle"
                ><i className="bi bi-pencil-square"></i></button>
                <button
                  onClick={() => del(p.id, p.title)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem 0.4rem', borderRadius: '4px' }}
                  title="Sayfayı sil"
                ><i className="bi bi-trash3-fill"></i></button>
              </div>
            )}
          </div>
          {/* Render children */}
          {renderTree(p.id, depth + 1)}
        </div>
      )
    })
  }

  return (
    <Card title="📑 Sayfa / Bölüm Yönetimi">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <Inp
          value={icon} onChange={e => setIcon(e.target.value)}
          style={{ width: '60px', textAlign: 'center', fontSize: '1.2rem', padding: '0.4rem' }}
          placeholder="📄"
        />
        <Inp
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Sayfa başlığı"
          style={{ flex: 1, minWidth: '140px' }}
          onKeyDown={e => e.key === 'Enter' && create()}
        />
        <Btn onClick={create}>+ Oluştur</Btn>
      </div>
      {msg && <p style={{ fontSize: '0.82rem', color: msg.startsWith('✅') ? '#10b981' : '#ef4444', marginBottom: '0.75rem' }}>{msg}</p>}

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
        💡 <b>İpucu:</b> Bir sayfayı diğerinin içine taşımak (alt sayfa yapmak) için sürükleyip üzerine bırakın. Sıralama için ▲/▼ oklarını kullanın.
      </p>

      {/* Root Drop Zone */}
      <div 
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => handleDrop(e, null)}
        style={{
          padding: '0.75rem', textAlign: 'center', borderRadius: '8px',
          border: dragOverId === null ? '2px dashed #10b981' : '1px dashed var(--border-medium)',
          background: dragOverId === null ? 'rgba(16,185,129,0.1)' : 'transparent',
          color: dragOverId === null ? '#10b981' : 'var(--text-tertiary)',
          fontSize: '0.85rem', marginBottom: '1rem', transition: 'all 0.2s',
          display: pages.length > 0 ? 'block' : 'none'
        }}
      >
        📥 Ana Menüye (Kök Dizin) taşımak için buraya sürükleyin
      </div>

      {pages.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Henüz ek sayfa oluşturulmadı.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {renderTree(null, 0)}
        </div>
      )}
    </Card>
  )
}

/* ── Veritabanındaki Tarihler ── */
function DatesSection() {
  const [dates, setDates]         = useState([])
  const [summary, setSummary]     = useState('')
  const [resetting, setResetting] = useState(false)
  const [deletingDate, setDeletingDate] = useState(null)
  const showToast = useToastStore(s => s.show)

  const load = useCallback(async () => {
    try {
      const { data } = await client.get('/admin/available-dates')
      if (data.success) {
        setDates(data.data || [])
        setSummary(data.toplam_gun ? `${data.toplam_gun} gün veri mevcut` : '')
      }
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const resetYear = async () => {
    if (!await confirmDialog('Tüm transfer verisi silinecek. Emin misiniz?')) return
    setResetting(true)
    let total = 0
    try {
      while (true) {
        const { data } = await client.post('/admin/clear_db')
        total += data.deleted || 0
        if (data.done) { showToast(data.message || `${total} satır silindi`, 'success'); break }
        await new Promise(r => setTimeout(r, 100))
      }
      load()
    } catch (e) {
      showToast('Silme hatası: ' + (e.response?.data?.message || 'Bağlantı hatası'), 'error')
    } finally { setResetting(false) }
  }

  const deleteDate = async (tarih) => {
    if (!await confirmDialog(`${tarih} tarihine ait tüm veriler silinecek. Emin misiniz?`)) return
    setDeletingDate(tarih)
    try {
      const { data } = await client.delete(`/admin/date/${tarih}`)
      if (data.success) {
        showToast(`${tarih} silindi (${data.deleted} satır)`, 'success')
        load()
      } else {
        showToast(data.error || 'Silme hatası', 'error')
      }
    } catch { showToast('Bağlantı hatası', 'error') }
    finally { setDeletingDate(null) }
  }

  return (
    <Card title="📅 Veritabanındaki Tarihler">
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>{summary}</span>
        <Btn variant="secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }} onClick={load}>↺ Yenile</Btn>
        <Btn variant="danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }} onClick={resetYear} disabled={resetting}>
          {resetting ? 'Siliniyor...' : <><i className="bi bi-trash3-fill"></i> Tüm Veriyi Sil</>}
        </Btn>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-medium)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)', position: 'sticky', top: 0 }}>
              {['Tarih','Evrak Sayısı','Satır Sayısı','Ambar Sayısı',''].map(h => (
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: h === 'Tarih' || h === '' ? 'left' : 'right', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-medium)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Henüz veri yüklenmemiş.</td></tr>
            )}
            {dates.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-medium)' }}>
                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'var(--text-primary)' }}>{r.tarih}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.evrak_sayisi?.toLocaleString('tr-TR')}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.satir_sayisi?.toLocaleString('tr-TR')}</td>
                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.ambar_sayisi}</td>
                <td style={{ padding: '0.25rem 0.5rem', textAlign: 'center' }}>
                  <button
                    onClick={() => deleteDate(r.tarih)}
                    disabled={deletingDate === r.tarih}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '0.2rem 0.4rem', borderRadius: '4px', opacity: deletingDate === r.tarih ? 0.4 : 1 }}
                    title={`${r.tarih} tarihini sil`}
                  >
                    <i className="bi bi-trash3-fill"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
