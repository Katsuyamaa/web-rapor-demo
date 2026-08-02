import { confirmDialog } from '../../store/dialogStore'
import { useEffect, useState } from 'react';
import {
  getRoadmapItems, createRoadmapItem, updateRoadmapItem, deleteRoadmapItem
} from '../../api/roadmap';

const CATEGORIES = [
  { value: 'veri_sagligi', label: 'Veri Sağlığı', icon: 'bi-shield-check',   color: 'text-emerald-600 bg-emerald-50' },
  { value: 'uyarilar',     label: 'Uyarılar',      icon: 'bi-bell',           color: 'text-orange-600 bg-orange-50' },
  { value: 'analitik',     label: 'Analitik',      icon: 'bi-graph-up-arrow', color: 'text-blue-600 bg-blue-50' },
  { value: 'workflow',     label: 'Workflow',      icon: 'bi-arrow-repeat',   color: 'text-violet-600 bg-violet-50' },
  { value: 'diger',        label: 'Diğer',         icon: 'bi-three-dots',     color: 'text-gray-500 bg-gray-100' },
];

const STATUSES = [
  { value: 'fikir',      label: 'Fikir',       badge: 'bg-gray-100 text-gray-600',    border: 'border-l-gray-300',   dot: 'bg-gray-400',   header: 'from-gray-50 to-gray-100/60' },
  { value: 'planli',     label: 'Planlı',      badge: 'bg-blue-100 text-blue-700',    border: 'border-l-blue-400',   dot: 'bg-blue-500',   header: 'from-blue-50 to-blue-100/60' },
  { value: 'gelistirme', label: 'Geliştirme',  badge: 'bg-amber-100 text-amber-700',  border: 'border-l-amber-400',  dot: 'bg-amber-500',  header: 'from-amber-50 to-amber-100/60' },
  { value: 'tamamlandi', label: 'Tamamlandı',  badge: 'bg-green-100 text-green-700',  border: 'border-l-green-400',  dot: 'bg-green-500',  header: 'from-green-50 to-green-100/60' },
  { value: 'iptal',      label: 'İptal',       badge: 'bg-red-100 text-red-600',      border: 'border-l-red-400',    dot: 'bg-red-400',    header: 'from-red-50 to-red-100/60' },
];

const EFFORTS = [
  { value: 'dusuk',  label: 'Düşük',   color: 'text-emerald-600 bg-emerald-50' },
  { value: 'orta',   label: 'Orta',    color: 'text-amber-600 bg-amber-50' },
  { value: 'yuksek', label: 'Yüksek',  color: 'text-red-600 bg-red-50' },
];

const PRIORITIES = [
  { value: 1, label: 'Kritik',  color: 'bg-red-500 text-white' },
  { value: 2, label: 'Orta',   color: 'bg-amber-400 text-white' },
  { value: 3, label: 'Düşük',  color: 'bg-slate-400 text-white' },
];

const statusInfo   = (v) => STATUSES.find(s => s.value === v)   || STATUSES[0];
const categoryInfo = (v) => CATEGORIES.find(c => c.value === v) || CATEGORIES[4];
const effortInfo   = (v) => EFFORTS.find(e => e.value === v)    || EFFORTS[1];
const priorityInfo = (v) => PRIORITIES.find(p => p.value === v) || PRIORITIES[1];

const EMPTY_FORM = {
  title: '', description: '', category: 'diger', status: 'fikir',
  priority: 2, effort: 'orta', value_score: 'orta', notes: '',
};

export default function RoadmapTab() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterStatus, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [expandedId, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRoadmapItems(filterStatus ? { status: filterStatus } : {});
      setItems(data.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit   = (item) => {
    setEditItem(item);
    setForm({ title: item.title, description: item.description || '', category: item.category,
              status: item.status, priority: item.priority, effort: item.effort,
              value_score: item.value_score, notes: item.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      editItem ? await updateRoadmapItem(editItem.id, form) : await createRoadmapItem(form);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog('Bu öğeyi silmek istediğinizden emin misiniz?')) return;
    await deleteRoadmapItem(id);
    load();
  };

  const handleStatusChange = async (item, newStatus) => {
    await updateRoadmapItem(item.id, { status: newStatus });
    load();
  };

  /* grouped counts for tab badges */
  const counts = items.reduce((acc, it) => { acc[it.status] = (acc[it.status] || 0) + 1; return acc; }, {});

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${filterStatus === '' ? 'bg-gray-800 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Tümü
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${filterStatus === '' ? 'bg-white/20' : 'bg-gray-200 text-gray-500'}`}>{items.length}</span>
          </button>
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${filterStatus === s.value ? 'bg-gray-800 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
              {s.label}
              {counts[s.value] > 0 && (
                <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${filterStatus === s.value ? 'bg-white/20' : s.badge}`}>{counts[s.value]}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
        >
          <i className="bi bi-plus-lg" /> Yeni Ekle
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-300">
          <i className="bi bi-arrow-repeat animate-spin text-3xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <i className="bi bi-kanban text-5xl block mb-3" />
          <p className="text-sm text-gray-400">Kayıt bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const si  = statusInfo(item.status);
            const ci  = categoryInfo(item.category);
            const pi  = priorityInfo(item.priority);
            const isX = expandedId === item.id;
            return (
              <div key={item.id} className={`border-l-4 ${si.border} rounded-lg overflow-hidden shadow-sm transition-all`}
                   style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)' }}>
                {/* row */}
                <div
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition bg-gradient-to-r ${isX ? si.header : ''} hover:bg-gradient-to-r hover:${si.header}`}
                  onClick={() => setExpanded(isX ? null : item.id)}
                >
                  {/* priority badge */}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${pi.color}`}>{pi.label}</span>

                  {/* title + tags */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${si.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />{si.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${ci.color}`}>
                        <i className={`bi ${ci.icon} text-[10px]`} />{ci.label}
                      </span>
                    </div>
                    {item.description && !isX && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                    )}
                  </div>

                  <i className={`bi bi-chevron-${isX ? 'up' : 'down'} text-xs flex-shrink-0`} style={{ color: 'var(--text-secondary)' }} />
                </div>

                {/* expanded */}
                {isX && (
                  <div className="px-4 pb-4 pt-3 space-y-3 border-t" style={{ borderColor: 'var(--border-medium)' }}>
                    {item.description && (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${effortInfo(item.effort).color}`}>
                        <i className="bi bi-lightning-charge text-[11px]" /> Efor: {effortInfo(item.effort).label}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${effortInfo(item.value_score).color}`}>
                        <i className="bi bi-star text-[11px]" /> Değer: {effortInfo(item.value_score).label}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-xs px-3 py-2 rounded-lg italic" style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                        <i className="bi bi-sticky me-1.5" />{item.notes}
                      </p>
                    )}

                    {/* status switcher */}
                    <div>
                      <p className="text-[11px] font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Durumu Değiştir</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map(s => (
                          <button
                            key={s.value}
                            disabled={item.status === s.value}
                            onClick={() => handleStatusChange(item, s.value)}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                              item.status === s.value
                                ? `${s.badge} cursor-default opacity-90 ring-1 ring-inset ring-current/30`
                                : 'border hover:bg-gray-100 text-gray-500'
                            }`}
                            style={item.status !== s.value ? { borderColor: 'var(--border-medium)' } : {}}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium hover:bg-gray-50 transition flex items-center gap-1"
                        style={{ borderColor: 'var(--border-medium)', color: 'var(--text-secondary)' }}
                      ><i className="bi bi-pencil" /> Düzenle</button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 font-medium hover:bg-red-50 transition flex items-center gap-1"
                      ><i className="bi bi-trash" /> Sil</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <i className="bi bi-kanban text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-800">{editItem ? 'Öğeyi Düzenle' : 'Yeni Yapılacak'}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Başlık *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Özellik veya görev başlığı"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                  placeholder="Detaylı açıklama..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Kategori', field: 'category', options: CATEGORIES.map(c => ({ value: c.value, label: c.label })) },
                  { label: 'Durum',    field: 'status',   options: STATUSES.map(s => ({ value: s.value, label: s.label })) },
                  { label: 'Öncelik', field: 'priority',  options: PRIORITIES.map(p => ({ value: p.value, label: `${p.value} — ${p.label}` })), num: true },
                  { label: 'Efor',    field: 'effort',    options: EFFORTS.map(e => ({ value: e.value, label: e.label })) },
                ].map(({ label, field, options, num }) => (
                  <div key={field}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                    <select
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: num ? Number(e.target.value) : e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    >
                      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Notlar</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                  placeholder="Ek notlar..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-white transition">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
              >
                {saving ? <><i className="bi bi-arrow-repeat animate-spin" /> Kaydediliyor…</> : <><i className="bi bi-check-lg" /> Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
