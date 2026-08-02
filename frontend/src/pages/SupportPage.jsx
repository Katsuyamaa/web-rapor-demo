import { useState, useEffect, useRef, useCallback } from 'react';
import { getTickets, getTicket, createTicket, addComment } from '../api/support';
import useAuthStore from '../store/authStore';

const TYPES = [
  { value: 'hata',  label: 'Hata Bildirimi',  icon: 'bi-bug-fill',             color: 'text-red-500 bg-red-50',       border: 'border-l-red-400',    avatar: 'bg-red-100 text-red-500' },
  { value: 'istek', label: 'Özellik İsteği',  icon: 'bi-lightbulb-fill',       color: 'text-violet-600 bg-violet-50', border: 'border-l-violet-400', avatar: 'bg-violet-100 text-violet-600' },
  { value: 'soru',  label: 'Soru',            icon: 'bi-question-circle-fill', color: 'text-blue-600 bg-blue-50',     border: 'border-l-blue-400',   avatar: 'bg-blue-100 text-blue-600' },
];
const STATUSES = [
  { value: 'yeni',        label: 'Yeni',        badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',   ring: 'ring-blue-300' },
  { value: 'inceleniyor', label: 'İnceleniyor', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500',  ring: 'ring-amber-300' },
  { value: 'cozuldu',     label: 'Çözüldü',     badge: 'bg-green-100 text-green-700', dot: 'bg-green-500',  ring: 'ring-green-300' },
  { value: 'reddedildi',  label: 'Reddedildi',  badge: 'bg-red-100 text-red-600',     dot: 'bg-red-500',    ring: 'ring-red-300' },
];

const ADMIN_STATUSES = ['yeni', 'inceleniyor', 'cozuldu', 'reddedildi'];

const typeInfo   = (v) => TYPES.find(t => t.value === v)   || TYPES[2];
const statusInfo = (v) => STATUSES.find(s => s.value === v) || STATUSES[0];
const fmtDate    = (d) => d ? new Date(d).toLocaleString('tr-TR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';

const EMPTY_FORM = { title: '', description: '', type: 'soru' };

export default function SupportPage() {
  const user    = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  const [tickets, setTickets]           = useState([]);
  const [ticketsLoading, setTL]         = useState(true);
  const [filterStatus, setFilter]       = useState('');
  const [selected, setSelected]         = useState(null);
  const [detail, setDetail]             = useState(null);
  const [detailLoading, setDL]          = useState(false);
  const [comment, setComment]           = useState('');
  const [sending, setSending]           = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [formError, setFormError]       = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const commentsEndRef                  = useRef(null);
  const pollRef                         = useRef(null);

  /* ── load ticket list ── */
  const loadTickets = useCallback(async () => {
    setTL(true);
    try {
      const p = filterStatus ? { status: filterStatus } : {};
      const d = await getTickets(p);
      setTickets(d.data || []);
    } finally { setTL(false); }
  }, [filterStatus]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  /* ── load detail with silent refresh option ── */
  const loadDetail = useCallback(async (id, silent = false) => {
    if (!silent) setDL(true);
    try {
      const d = await getTicket(id);
      setDetail(d.ticket);
    } finally { if (!silent) setDL(false); }
  }, []);

  /* ── polling: 4s when a ticket is open ── */
  useEffect(() => {
    clearInterval(pollRef.current);
    if (selected) {
      pollRef.current = setInterval(() => loadDetail(selected, true), 4_000);
    }
    return () => clearInterval(pollRef.current);
  }, [selected, loadDetail]);

  /* ── scroll to bottom on new comment ── */
  useEffect(() => {
    if (detail?.comments?.length)
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [detail?.comments?.length]);

  const openTicket = async (ticket) => {
    setSelected(ticket.id);
    setDetail(null);
    setShowNew(false);
    await loadDetail(ticket.id);
  };

  const handleSend = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    try {
      const d = await addComment(detail.id, comment.trim());
      setComment('');
      setDetail(prev => ({
        ...prev,
        comments: [...(prev.comments || []), d.comment],
        status: prev.status === 'yeni' ? 'inceleniyor' : prev.status,
      }));
      setTickets(ts => ts.map(t => t.id === detail.id && t.status === 'yeni' ? { ...t, status: 'inceleniyor' } : t));
    } finally { setSending(false); }
  };

  const handleCreate = async () => {
    setFormError('');
    if (!form.title.trim()) { setFormError('Başlık gerekli.'); return; }
    if (form.description.trim().length < 10) { setFormError('Açıklama en az 10 karakter olmalı.'); return; }
    setSubmitting(true);
    try {
      await createTicket({ ...form, page_url: window.location.pathname });
      setForm(EMPTY_FORM);
      setShowNew(false);
      await loadTickets();
    } catch (e) {
      setFormError(e?.response?.data?.error || 'Bir hata oluştu.');
    } finally { setSubmitting(false); }
  };

  /* admin: status change */
  const handleStatusChange = async (newStatus) => {
    if (!isAdmin) return;
    const { updateTicket } = await import('../api/support');
    await updateTicket(detail.id, { status: newStatus });
    setDetail(d => ({ ...d, status: newStatus }));
    setTickets(ts => ts.map(t => t.id === detail.id ? { ...t, status: newStatus } : t));
  };

  const isClosed = detail && ['cozuldu', 'reddedildi'].includes(detail.status);
  const counts   = tickets.reduce((a, t) => { a[t.status] = (a[t.status] || 0) + 1; return a; }, {});

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 3rem)', display: 'flex', flexDirection: 'column' }}>
      {/* page title */}
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          <i className="bi bi-headset me-2 text-blue-600" />Destek Talepleri
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          {isAdmin ? 'Tüm kullanıcı destek taleplerini yönetin.' : 'Destek taleplerinizi oluşturun ve takip edin.'}
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0 }}>

        {/* ── LEFT column: list ── */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
             className={showNew || (selected && window.innerWidth < 768) ? 'hidden md:flex' : 'flex'}>

          {/* toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {!isAdmin && (
              <button
                onClick={() => { setShowNew(true); setSelected(null); setDetail(null); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-sm"
              ><i className="bi bi-plus-lg" /> Yeni Talep</button>
            )}

            {/* status filters */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setFilter('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterStatus === '' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >Tümü <span className={`ml-1 text-[10px] font-black px-1 rounded ${filterStatus === '' ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>{tickets.length}</span></button>
              {STATUSES.map(s => (
                <button key={s.value} onClick={() => setFilter(s.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${filterStatus === s.value ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                  {counts[s.value] > 0 && <span className={`text-[10px] font-black px-1 rounded ${filterStatus === s.value ? 'bg-white/20' : s.badge}`}>{counts[s.value]}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* list */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="space-y-2 pr-0.5">
            {ticketsLoading ? (
              <div className="flex justify-center py-12 text-gray-300">
                <i className="bi bi-arrow-repeat animate-spin text-2xl" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <i className="bi bi-inbox text-4xl text-gray-200" />
                <p className="text-sm text-gray-400">Talep bulunamadı.</p>
              </div>
            ) : tickets.map(t => {
              const si = statusInfo(t.status);
              const ti = typeInfo(t.type);
              const isActive = selected === t.id;
              return (
                <button key={t.id} onClick={() => openTicket(t)}
                  className={`w-full text-left rounded-xl border-l-4 overflow-hidden transition-all ${ti.border} ${isActive ? 'ring-2 ring-blue-300 shadow-md' : 'hover:shadow-sm'}`}
                  style={{ background: isActive ? 'rgba(37,99,235,0.05)' : 'var(--bg-surface)', border: `1px solid var(--border-medium)` }}
                >
                  <div className="px-3 py-2.5 flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ti.avatar}`}>
                      <i className={`bi ${ti.icon} text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {isAdmin ? `${t.username} · ` : ''}{fmtDate(t.created_at)}
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 mt-0.5 ${si.badge}`}>{si.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: new ticket form ── */}
        {showNew && (
          <div className="flex-1 rounded-2xl border overflow-hidden flex flex-col shadow-sm" style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-surface)' }}>
            <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border-medium)' }}>
              <button onClick={() => setShowNew(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition text-gray-400">
                <i className="bi bi-chevron-left" />
              </button>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Yeni Talep Oluştur</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Talep Türü</label>
                <div className="grid grid-cols-3 gap-3">
                  {TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`flex flex-col items-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition ${form.type === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      <i className={`bi ${t.icon} text-xl ${form.type === t.value ? typeInfo(t.value).color.split(' ')[0] : 'text-gray-300'}`} />
                      {t.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Başlık *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={255}
                  placeholder="Kısa ve açıklayıcı bir başlık"
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>Açıklama *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={6}
                  placeholder="Sorunu veya isteği detaylıca açıklayın…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ background: 'var(--bg-main)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 flex items-center gap-2">
                  <i className="bi bi-exclamation-circle-fill" />{formError}
                </p>
              )}
              <button onClick={handleCreate} disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
              >
                {submitting ? <><i className="bi bi-arrow-repeat animate-spin" />Gönderiliyor…</> : <><i className="bi bi-send-fill" />Talebi Gönder</>}
              </button>
            </div>
          </div>
        )}

        {/* ── RIGHT: chat detail ── */}
        {!showNew && (
          <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col shadow-sm ${!selected ? '' : ''}`}
               style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-surface)', minHeight: 0 }}>
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <i className="bi bi-chat-dots text-4xl text-gray-200" />
                </div>
                <p className="font-semibold text-gray-400">Görüntülemek için bir talep seçin</p>
                {!isAdmin && (
                  <button onClick={() => setShowNew(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition mt-2">
                    <i className="bi bi-plus-lg" /> Yeni Talep Oluştur
                  </button>
                )}
              </div>
            ) : detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <i className="bi bi-arrow-repeat animate-spin text-2xl text-gray-300" />
              </div>
            ) : detail ? (
              <>
                {/* header */}
                <div className="flex-shrink-0 border-b px-5 py-4" style={{ borderColor: 'var(--border-medium)' }}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo(detail.type).avatar}`}>
                      <i className={`bi ${typeInfo(detail.type).icon} text-lg`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>{detail.title}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {isAdmin && <><i className="bi bi-person me-1" />{detail.username} · </>}{fmtDate(detail.created_at)}
                        {detail.page_url && <> · <span className="opacity-70">{detail.page_url}</span></>}
                      </p>
                    </div>
                  </div>
                  {/* status row */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {isAdmin ? STATUSES.map(s => (
                      <button key={s.value} disabled={detail.status === s.value} onClick={() => handleStatusChange(s.value)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                          detail.status === s.value ? `${s.badge} ring-2 ${s.ring} cursor-default` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                      </button>
                    )) : (
                      <span className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 ${statusInfo(detail.status).badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo(detail.status).dot}`} />
                        {statusInfo(detail.status).label}
                      </span>
                    )}
                  </div>
                </div>

                {/* chat thread */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ minHeight: 0 }}>
                  {/* original description */}
                  <div className={`flex ${!isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%]">
                      <p className={`text-[11px] font-bold mb-1.5 px-1 ${!isAdmin ? 'text-right text-blue-500' : ''}`}
                         style={isAdmin ? { color: 'var(--text-secondary)' } : {}}>
                        {isAdmin ? detail.username : 'Siz'}
                      </p>
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                        !isAdmin ? 'bg-blue-600 text-white rounded-tr-sm' : 'rounded-tl-sm'
                      }`} style={isAdmin ? { background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' } : {}}>
                        {detail.description}
                      </div>
                      <p className={`text-[10px] mt-1.5 px-1 ${!isAdmin ? 'text-right' : ''}`} style={{ color: 'var(--text-secondary)' }}>{fmtDate(detail.created_at)}</p>
                    </div>
                  </div>

                  {/* comments */}
                  {(detail.comments || []).map((c, i) => {
                    const isMine = isAdmin ? Boolean(c.is_admin) : !Boolean(c.is_admin);
                    return (
                      <div key={c.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%]`}>
                          <p className={`text-[11px] font-bold mb-1.5 px-1 ${isMine ? 'text-right text-blue-500' : ''}`}
                             style={!isMine ? { color: 'var(--text-secondary)' } : {}}>
                            {c.is_admin
                              ? (isAdmin ? 'Siz (Admin)' : <><i className="bi bi-shield-fill me-1 text-[10px]" />Destek Ekibi</>)
                              : (isAdmin ? c.username : 'Siz')}
                          </p>
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                            isMine
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'rounded-tl-sm'
                          }`} style={!isMine ? { background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' } : {}}>
                            {c.comment}
                          </div>
                          <p className={`text-[10px] mt-1.5 px-1 ${isMine ? 'text-right' : ''}`} style={{ color: 'var(--text-secondary)' }}>{fmtDate(c.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}

                  {isClosed && (
                    <div className="flex justify-center py-2">
                      <span className="text-xs px-4 py-1.5 rounded-full bg-gray-100 text-gray-400">
                        <i className="bi bi-lock me-1" />Talep kapatılmış
                      </span>
                    </div>
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* reply */}
                {(!isClosed || isAdmin) && (
                  <div className="flex gap-3 px-5 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border-medium)' }}>
                    <textarea value={comment} onChange={e => setComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      rows={2} placeholder="Mesaj yaz… (Enter gönderir, Shift+Enter yeni satır)"
                      className="flex-1 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border"
                      style={{ background: 'var(--bg-main)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                    />
                    <button onClick={handleSend} disabled={sending || !comment.trim()}
                      className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition self-end shadow-sm flex items-center gap-2 flex-shrink-0"
                    >
                      {sending ? <i className="bi bi-arrow-repeat animate-spin" /> : <><i className="bi bi-send-fill" />Gönder</>}
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
