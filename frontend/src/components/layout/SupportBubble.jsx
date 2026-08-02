import { useState, useEffect, useRef, useCallback } from 'react'
import { createTicket, getTickets, getTicket, addComment, getUnreadCount } from '../../api/support'
import useSupportStore from '../../store/supportStore'
import useAuthStore from '../../store/authStore'

/* ── tiny palette — semantic only, no hardcoded brand colors ── */
const STATUS = {
  yeni:        { label: 'Yeni',        dot: '#3b82f6', bg: 'rgba(59,130,246,.12)',  fg: '#2563eb' },
  inceleniyor: { label: 'İnceleniyor', dot: '#f59e0b', bg: 'rgba(245,158,11,.12)',  fg: '#b45309' },
  cozuldu:     { label: 'Çözüldü',     dot: '#10b981', bg: 'rgba(16,185,129,.12)',  fg: '#047857' },
  reddedildi:  { label: 'Reddedildi',  dot: '#ef4444', bg: 'rgba(239,68,68,.12)',   fg: '#b91c1c' },
}
const TYPE = {
  hata:  { label: 'Hata',   icon: 'bi-bug-fill',             dot: '#ef4444', bg: 'rgba(239,68,68,.12)' },
  istek: { label: 'İstek',  icon: 'bi-lightbulb-fill',       dot: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  soru:  { label: 'Soru',   icon: 'bi-question-circle-fill', dot: '#2563eb', bg: 'rgba(37,99,235,.12)' },
}
const fmtDate = (d) => d
  ? new Date(d).toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
  : ''
const EMPTY = { title: '', description: '', type: 'soru' }

/* ── shared input style ── */
const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '0.5rem 0.75rem',
  border: '1.5px solid var(--border-medium)', borderRadius: 10,
  background: 'var(--bg-main)', color: 'var(--text-primary)',
  fontSize: '0.875rem', fontFamily: 'var(--sans)', outline: 'none',
  transition: 'border-color .15s',
}

function SupportWidget() {
  const { open, setOpen }         = useSupportStore()
  const isAdmin                   = useAuthStore(s => s.user?.role === 'admin')
  const [view, setView]           = useState('home')   // home | new | chat
  const [tickets, setTickets]     = useState([])
  const [tLoading, setTLoading]   = useState(false)
  const [detail, setDetail]       = useState(null)
  const [dLoading, setDLoading]   = useState(false)
  const [comment, setComment]     = useState('')
  const [sending, setSending]     = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [submitting, setSub]      = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [unread, setUnread]       = useState(0)
  const endRef                    = useRef(null)
  const pollRef                   = useRef(null)
  const panelRef                  = useRef(null)

  /* unread badge */
  useEffect(() => {
    const run = () => getUnreadCount().then(d => setUnread(d.count || 0)).catch(() => {})
    run()
    const t = setInterval(run, 60_000)
    return () => clearInterval(t)
  }, [])

  /* outside click to close */
  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  /* ticket list */
  const loadTickets = useCallback(async () => {
    setTLoading(true)
    try { const d = await getTickets(); setTickets(d.data || []) }
    finally { setTLoading(false) }
  }, [])

  /* detail */
  const loadDetail = useCallback(async (id, silent = false) => {
    if (!silent) setDLoading(true)
    try { const d = await getTicket(id); setDetail(d.ticket) }
    finally { if (!silent) setDLoading(false) }
  }, [])

  /* polling 4 s when chat open */
  useEffect(() => {
    clearInterval(pollRef.current)
    if (open && view === 'chat' && detail?.id)
      pollRef.current = setInterval(() => loadDetail(detail.id, true), 4_000)
    return () => clearInterval(pollRef.current)
  }, [open, view, detail?.id])

  /* scroll to bottom */
  useEffect(() => {
    if (detail?.comments?.length)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60)
  }, [detail?.comments?.length])

  const handleOpen = async () => {
    if (open) { setOpen(false); return }
    setOpen(true); setView('home'); setUnread(0)
    await loadTickets()
  }

  const openChat = async (t) => {
    setView('chat'); setDetail(null)
    await loadDetail(t.id)
  }

  const handleSend = async () => {
    if (!comment.trim() || sending) return
    setSending(true)
    try {
      const d = await addComment(detail.id, comment.trim())
      setComment('')
      setDetail(p => ({ ...p, comments: [...(p.comments || []), d.comment], status: p.status === 'yeni' ? 'inceleniyor' : p.status }))
      setTickets(ts => ts.map(t => t.id === detail.id && t.status === 'yeni' ? { ...t, status: 'inceleniyor' } : t))
    } finally { setSending(false) }
  }

  const handleCreate = async () => {
    setFormErr('')
    if (!form.title.trim()) { setFormErr('Başlık gerekli.'); return }
    if (form.description.trim().length < 10) { setFormErr('Açıklama en az 10 karakter olmalı.'); return }
    setSub(true)
    try {
      await createTicket({ ...form, page_url: window.location.pathname })
      setForm(EMPTY); await loadTickets(); setView('home')
    } catch (e) { setFormErr(e?.response?.data?.error || 'Bir hata oluştu.') }
    finally { setSub(false) }
  }

  const isClosed = detail && ['cozuldu', 'reddedildi'].includes(detail.status)

  /* panel dimensions: mobile = near full-width, desktop fixed */
  const panelStyle = {
    position: 'fixed',
    bottom: '5rem',
    right: '1rem',
    width: 'min(360px, calc(100vw - 1.5rem))',
    height: 'min(540px, calc(100dvh - 7rem))',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-medium)',
    borderRadius: 18,
    boxShadow: 'var(--shadow-float)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9998,
    animation: 'sbIn .2s cubic-bezier(.22,1,.36,1) both',
  }

  const headerStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0.75rem 1rem',
    background: 'var(--gradient)',
    color: '#fff',
    flexShrink: 0,
  }

  const scrollArea = { flex: 1, overflowY: 'auto', overflowX: 'hidden' }

  return (
    <>
      <style>{`
        @keyframes sbIn { from{opacity:0;transform:translateY(14px) scale(.96)} to{opacity:1;transform:none} }
        .sb-ticket:hover { background: var(--bg-main) !important; }
        .sb-type-btn:hover { border-color: var(--primary) !important; }
        .sb-input:focus { border-color: var(--primary) !important; }
        .sb-send:hover:not(:disabled) { opacity: .85 }
        .sb-send:disabled { opacity: .4; cursor: default }
        .sb-back:hover { background: rgba(255,255,255,.25) !important }
        .sb-close:hover { background: rgba(255,255,255,.25) !important }
        .sb-scrollbar::-webkit-scrollbar { width: 4px }
        .sb-scrollbar::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 4px }
      `}</style>

      {/* ── panel ── */}
      {open && (
        <div ref={panelRef} style={panelStyle}>

          {/* header */}
          <div style={headerStyle}>
            {view !== 'home' && (
              <button
                className="sb-back"
                onClick={() => { setView('home'); setDetail(null); loadTickets() }}
                style={{ width:28, height:28, borderRadius:8, border:'none', background:'rgba(255,255,255,.18)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
              ><i className="bi bi-chevron-left" style={{ fontSize:13 }} /></button>
            )}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:'0.9rem', lineHeight:1.2 }}>
                {view === 'home' && 'Destek'}
                {view === 'new'  && 'Yeni Talep'}
                {view === 'chat' && (detail?.title || '…')}
              </div>
              {view === 'chat' && detail && (
                <div style={{ fontSize:'0.7rem', opacity:.75, marginTop:2, display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background: STATUS[detail.status]?.dot || '#94a3b8', display:'inline-block' }} />
                  {STATUS[detail.status]?.label || detail.status}
                </div>
              )}
            </div>
            <button
              className="sb-close"
              onClick={() => setOpen(false)}
              style={{ width:28, height:28, borderRadius:8, border:'none', background:'rgba(255,255,255,.18)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
            ><i className="bi bi-x-lg" style={{ fontSize:12 }} /></button>
          </div>

          {/* ── HOME ── */}
          {view === 'home' && (
            <div style={scrollArea} className="sb-scrollbar">
              {!isAdmin && (
                <div style={{ padding:'0.75rem', borderBottom:'1px solid var(--border-medium)' }}>
                  <button
                    onClick={() => { setView('new'); setFormErr(''); setForm(EMPTY) }}
                    style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'0.6rem', background:'var(--gradient)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:'var(--sans)' }}
                  ><i className="bi bi-plus-lg" /> Yeni Talep Oluştur</button>
                </div>
              )}

              {tLoading ? (
                <div style={{ display:'flex', justifyContent:'center', padding:'2.5rem 0', color:'var(--text-tertiary)' }}>
                  <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize:22 }} />
                </div>
              ) : tickets.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2.5rem 1rem', gap:8, color:'var(--text-tertiary)' }}>
                  <i className="bi bi-chat-dots" style={{ fontSize:32, opacity:.4 }} />
                  <span style={{ fontSize:'0.85rem' }}>{isAdmin ? 'Henüz talep yok.' : 'Henüz talebiniz yok.'}</span>
                </div>
              ) : (
                <div style={{ padding:'0.5rem 0.5rem' }}>
                  <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', padding:'0.25rem 0.5rem 0.5rem' }}>
                    {isAdmin ? 'Tüm Talepler' : 'Taleplerim'}
                  </div>
                  {tickets.map(t => {
                    const ty = TYPE[t.type] || TYPE.soru
                    const st = STATUS[t.status] || STATUS.yeni
                    return (
                      <button key={t.id} className="sb-ticket"
                        onClick={() => openChat(t)}
                        style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:10, padding:'0.6rem 0.5rem', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', fontFamily:'var(--sans)' }}
                      >
                        <div style={{ width:34, height:34, borderRadius:'50%', background:ty.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <i className={`bi ${ty.icon}`} style={{ fontSize:14, color:ty.dot }} />
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{t.title}</div>
                          <div style={{ fontSize:'0.7rem', color:'var(--text-tertiary)', marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
                            {isAdmin && t.username && (
                              <><span style={{ fontWeight:600, color:'var(--text-secondary)' }}>{t.username}</span><span style={{ opacity:.4 }}>·</span></>
                            )}
                            <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot, display:'inline-block', flexShrink:0 }} />
                            {st.label} · {fmtDate(t.created_at)}
                          </div>
                        </div>
                        <i className="bi bi-chevron-right" style={{ fontSize:11, color:'var(--text-tertiary)', flexShrink:0 }} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── NEW ── */}
          {view === 'new' && (
            <div style={{ ...scrollArea, padding:'1rem' }} className="sb-scrollbar">
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:8 }}>Tür</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {Object.entries(TYPE).map(([val, ty]) => (
                    <button key={val} className="sb-type-btn"
                      onClick={() => setForm(f => ({ ...f, type: val }))}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'0.6rem 0.25rem', borderRadius:10, border:`2px solid ${form.type === val ? 'var(--primary)' : 'var(--border-medium)'}`, background: form.type === val ? 'var(--primary-light)' : 'var(--bg-main)', cursor:'pointer', fontFamily:'var(--sans)', transition:'border-color .15s' }}
                    >
                      <i className={`bi ${ty.icon}`} style={{ fontSize:18, color: form.type === val ? 'var(--primary)' : ty.dot }} />
                      <span style={{ fontSize:'0.7rem', fontWeight:600, color: form.type === val ? 'var(--primary)' : 'var(--text-secondary)' }}>{ty.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>Başlık *</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} maxLength={255}
                  className="sb-input" style={inputStyle} placeholder="Kısa ve açıklayıcı bir başlık" />
              </div>

              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-tertiary)', marginBottom:6 }}>Açıklama *</div>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} rows={4}
                  className="sb-input" style={{ ...inputStyle, resize:'none' }} placeholder="Sorunu veya isteği açıklayın…" />
              </div>

              {formErr && (
                <div style={{ padding:'0.5rem 0.75rem', background:'rgba(239,68,68,.1)', borderRadius:8, color:'#b91c1c', fontSize:'0.8rem', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                  <i className="bi bi-exclamation-circle-fill" style={{ flexShrink:0 }} />{formErr}
                </div>
              )}

              <button onClick={handleCreate} disabled={submitting}
                className="sb-send"
                style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'0.65rem', background:'var(--gradient)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:'0.85rem', cursor:'pointer', fontFamily:'var(--sans)' }}
              >
                {submitting ? <><i className="bi bi-arrow-repeat animate-spin" /> Gönderiliyor…</> : <><i className="bi bi-send-fill" /> Gönder</>}
              </button>
            </div>
          )}

          {/* ── CHAT ── */}
          {view === 'chat' && (
            <>
              {dLoading ? (
                <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-tertiary)' }}>
                  <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize:22 }} />
                </div>
              ) : detail ? (
                <>
                  {/* messages */}
                  <div style={{ ...scrollArea, padding:'0.75rem' }} className="sb-scrollbar">
                    {/* original description */}
                    <div style={{ display:'flex', justifyContent: isAdmin ? 'flex-start' : 'flex-end', marginBottom:12 }}>
                      <div style={{ maxWidth:'82%' }}>
                        <div style={{ fontSize:'0.68rem', fontWeight:600, color: isAdmin ? 'var(--text-tertiary)' : 'var(--primary)', marginBottom:4, textAlign: isAdmin ? 'left' : 'right' }}>{isAdmin ? detail.username : 'Siz'} · {fmtDate(detail.created_at)}</div>
                        <div style={{ background: isAdmin ? 'var(--bg-main)' : 'var(--gradient)', border: isAdmin ? '1px solid var(--border-medium)' : 'none', borderRadius: isAdmin ? '4px 16px 16px 16px' : '16px 4px 16px 16px', padding:'0.6rem 0.85rem', fontSize:'0.85rem', color: isAdmin ? 'var(--text-primary)' : '#fff', lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word', boxShadow: isAdmin ? 'none' : 'var(--shadow-primary)' }}>
                          {detail.description}
                        </div>
                      </div>
                    </div>

                    {/* comments */}
                    {(detail.comments || []).map((c, i) => {
                      const fromAdmin = Boolean(c.is_admin)
                      const isMine = isAdmin ? fromAdmin : !fromAdmin
                      return (
                        <div key={c.id || i} style={{ display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom:12 }}>
                          <div style={{ maxWidth:'82%' }}>
                            <div style={{ fontSize:'0.68rem', fontWeight:600, color: isMine ? 'var(--primary)' : 'var(--text-tertiary)', marginBottom:4, textAlign: isMine ? 'right' : 'left' }}>
                              {fromAdmin ? <><i className="bi bi-shield-fill" style={{ marginRight:3, fontSize:9 }} />Destek Ekibi</> : (isAdmin ? c.username : 'Siz')} · {fmtDate(c.created_at)}
                            </div>
                            <div style={{ background: isMine ? 'var(--gradient)' : 'var(--bg-main)', border: isMine ? 'none' : '1px solid var(--border-medium)', borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding:'0.6rem 0.85rem', fontSize:'0.85rem', color: isMine ? '#fff' : 'var(--text-primary)', lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word', boxShadow: isMine ? 'var(--shadow-primary)' : 'none' }}>
                              {c.comment}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {isClosed && (
                      <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
                        <span style={{ fontSize:'0.75rem', color:'var(--text-tertiary)', background:'var(--bg-main)', border:'1px solid var(--border-medium)', borderRadius:20, padding:'0.25rem 0.85rem' }}>
                          <i className="bi bi-lock me-1" style={{ fontSize:10 }} />Talep kapatılmış
                        </span>
                      </div>
                    )}
                    <div ref={endRef} />
                  </div>

                  {/* reply */}
                  {!isClosed && (
                    <div style={{ padding:'0.6rem 0.75rem', borderTop:'1px solid var(--border-medium)', display:'flex', gap:8, flexShrink:0 }}>
                      <textarea value={comment} onChange={e => setComment(e.target.value)}
                        onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                        rows={2} placeholder="Mesaj yaz… (Enter gönderir)"
                        className="sb-input sb-scrollbar"
                        style={{ ...inputStyle, flex:1, resize:'none', padding:'0.5rem 0.65rem' }}
                      />
                      <button onClick={handleSend} disabled={sending || !comment.trim()} className="sb-send"
                        style={{ width:36, height:36, borderRadius:10, border:'none', background:'var(--gradient)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, alignSelf:'flex-end' }}
                      >
                        {sending ? <i className="bi bi-arrow-repeat animate-spin" style={{ fontSize:13 }} /> : <i className="bi bi-send-fill" style={{ fontSize:13 }} />}
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button onClick={handleOpen}
        style={{ position:'fixed', bottom:'1rem', right:'1rem', width:50, height:50, borderRadius:'50%', border:'none', background:'var(--gradient)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-primary)', zIndex:9999, transition:'transform .15s, opacity .15s', fontFamily:'var(--sans)' }}
        onMouseEnter={e => e.currentTarget.style.transform='scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        title="Destek"
      >
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-headset'}`} style={{ fontSize: open ? 16 : 18 }} />
        {!open && unread > 0 && (
          <span style={{ position:'absolute', top:-3, right:-3, background:'#ef4444', color:'#fff', fontSize:9, fontWeight:800, borderRadius:'50%', minWidth:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', boxShadow:'0 0 0 2px var(--bg-surface)' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </>
  )
}

export default function SupportBubble({ isLoggedIn }) {
  if (!isLoggedIn) return null
  return <SupportWidget />
}
