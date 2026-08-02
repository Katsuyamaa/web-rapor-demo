import { confirmDialog } from '../../store/dialogStore'
import { useState, useEffect, useCallback } from 'react'
import useAuthStore from '../../store/authStore'
import {
  getTemplates, getTemplateProducts, updateTemplateProducts,
  createTemplate, deleteTemplate, uploadTemplateFile, templateHasFile,
  getRuts, saveRut, updateRut, deleteRut, importXlsm, generateList,
} from '../../api/distribution'

const label = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: '0.4rem', display: 'block',
}
const card = {
  background: 'var(--bg-surface)', borderRadius: 14,
  border: '1px solid var(--border-medium)', padding: 24, marginBottom: 24,
}
const iconBtn = {
  background: 'none', border: '1px solid var(--border-medium)', borderRadius: 6,
  padding: '2px 7px', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)',
}

const TEMPLATE_LIST = [
  { key: 'dolap',    label: 'Dolap' },
  { key: 'dondurma', label: 'Dondurma' },
  { key: 'sandvic',  label: 'Sandviç' },
  { key: 'pasta',    label: 'Pasta' },
]

// ── Generate Section ──────────────────────────────────────────────────────────
function GenerateSection() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loadingKey, setLoadingKey] = useState(null)
  const [hasFiles, setHasFiles] = useState({})
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    getTemplates().then(r => {
      const list = r.data.data || []
      setTemplates(list)
      list.forEach(t => {
        templateHasFile(t.id).then(r2 => {
          setHasFiles(prev => ({ ...prev, [t.name]: r2.data.has_file }))
        }).catch(() => {})
      })
    }).catch(() => {})
  }, [])

  const handleDownload = async (tmplKey) => {
    setLoadingKey(tmplKey); setError('')
    try {
      const res = await generateList(date, [tmplKey])
      const url = URL.createObjectURL(new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${tmplKey}_${date}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.response?.data?.error || 'Excel oluşturulamadı')
    } finally { setLoadingKey(null) }
  }

  return (
    <div style={card}>
      <div style={{ marginBottom: 24 }}>
        <label style={label}>Tarih</label>
        <input
          type="date" value={date}
          onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border-medium)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {templates.map(t => {
          const isLoading = loadingKey === t.name
          const hasFile = hasFiles[t.name]
          return (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border-medium)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.display_name}</div>
                <div style={{ fontSize: 11, marginTop: 2, color: hasFile ? '#16a34a' : 'var(--text-tertiary)' }}>
                  {hasFile ? '✓ Excel şablonu yüklü' : 'Şablon dosyası yok — kod ile oluşturulur'}
                </div>
              </div>
              <button
                onClick={() => handleDownload(t.name)}
                disabled={!!loadingKey}
                className="btn-primary"
                style={{ padding: '7px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className={`bi ${isLoading ? 'bi-hourglass-split' : 'bi-file-earmark-excel'}`} />
                {isLoading ? 'Oluşturuluyor...' : 'İndir'}
              </button>
            </div>
          )
        })}
      </div>

      {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</div>}
    </div>
  )
}

// ── Template Management Section ───────────────────────────────────────────────
function TemplateSection() {
  const [templates, setTemplates] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [products, setProducts] = useState([])
  const [newProduct, setNewProduct] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newTmpl, setNewTmpl] = useState({ display_name: '', format_type: 'grid' })
  const [creating, setCreating] = useState(false)
  const [hasFile, setHasFile] = useState(false)
  const [uploading, setUploading] = useState(false)

  const loadTemplates = useCallback(() => {
    getTemplates().then(r => {
      const list = r.data.data || []
      setTemplates(list)
      if (list.length && !selectedId) setSelectedId(list[0].id)
    }).catch(() => {})
  }, [selectedId])

  useEffect(() => { loadTemplates() }, [])

  useEffect(() => {
    if (!selectedId) return
    getTemplateProducts(selectedId).then(r => setProducts(r.data.data || [])).catch(() => {})
    templateHasFile(selectedId).then(r => setHasFile(r.data.has_file)).catch(() => setHasFile(false))
  }, [selectedId])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true); setMsg('')
    try {
      await uploadTemplateFile(selectedId, file)
      setHasFile(true)
      setMsg('Excel şablonu yüklendi.')
    } catch (err) {
      setMsg(err.response?.data?.error || 'Yükleme hatası.')
    } finally { setUploading(false); e.target.value = '' }
  }

  const handleCreate = async () => {
    if (!newTmpl.display_name.trim()) return
    setCreating(true)
    try {
      const res = await createTemplate(newTmpl)
      setShowNew(false)
      setNewTmpl({ display_name: '', format_type: 'grid' })
      loadTemplates()
      setSelectedId(res.data.id)
      setMsg('Şablon oluşturuldu.')
    } catch (e) {
      setMsg(e.response?.data?.error || 'Oluşturma hatası.')
    } finally { setCreating(false) }
  }

  const handleDelete = async () => {
    const tmpl = templates.find(t => t.id === selectedId)
    if (!tmpl) return
    if (!await confirmDialog(`"${tmpl.display_name}" şablonunu silmek istediğinize emin misiniz?`)) return
    try {
      await deleteTemplate(selectedId)
      setSelectedId(null)
      setProducts([])
      loadTemplates()
      setMsg('Şablon silindi.')
    } catch (e) {
      setMsg(e.response?.data?.error || 'Silme hatası.')
    }
  }

  const move = (idx, dir) => {
    const next = [...products]
    const swap = idx + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    setProducts(next.map((p, i) => ({ ...p, sort_order: i })))
  }

  const remove = (idx) => setProducts(p => p.filter((_, i) => i !== idx).map((x, i) => ({ ...x, sort_order: i })))

  const addProduct = () => {
    const name = newProduct.trim()
    if (!name) return
    setProducts(p => [...p, { product_name: name, sort_order: p.length }])
    setNewProduct('')
  }

  const addSpacer = () =>
    setProducts(p => [...p, { product_name: null, sort_order: p.length }])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await updateTemplateProducts(selectedId, products)
      setMsg('Kaydedildi.')
    } catch { setMsg('Kaydetme hatası.') }
    finally { setSaving(false) }
  }

  const selected = templates.find(t => t.id === selectedId)

  return (
    <div style={card}>
      <div style={{ marginBottom: 16 }}>
        <label style={label}>Şablon</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedId || ''}
            onChange={e => setSelectedId(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border-medium)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
          >
            {templates.map(t => <option key={t.id} value={t.id}>{t.display_name} ({t.product_count} ürün)</option>)}
          </select>
          <button onClick={() => setShowNew(v => !v)} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>
            + Yeni Şablon
          </button>
          {selectedId && (
            <>
              <label style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12, background: hasFile ? '#dcfce7' : 'var(--bg-main)', border: `1px solid ${hasFile ? '#16a34a' : 'var(--border-medium)'}`, borderRadius: 8, color: hasFile ? '#16a34a' : 'var(--text-secondary)', fontWeight: 600 }}>
                <i className="bi bi-file-earmark-excel" />
                {uploading ? 'Yükleniyor...' : hasFile ? 'Excel Şablonu Yüklü ✓' : 'Excel Şablonu Yükle'}
                <input type="file" hidden accept=".xlsx,.xlsm" onChange={handleFileUpload} disabled={uploading} />
              </label>
              <button onClick={handleDelete} style={{ padding: '7px 12px', fontSize: 12, background: 'none', border: '1px solid #dc2626', borderRadius: 8, color: '#dc2626', cursor: 'pointer' }}>
                Şablonu Sil
              </button>
            </>
          )}
        </div>

        {showNew && (
          <div style={{ marginTop: 12, padding: 16, background: 'var(--bg-main)', borderRadius: 10, border: '1px solid var(--border-medium)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={label}>Şablon Adı</label>
              <input
                value={newTmpl.display_name}
                onChange={e => setNewTmpl(d => ({ ...d, display_name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="ör: Börek Dağıtım"
                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)', minWidth: 180 }}
              />
            </div>
            <div>
              <label style={label}>Format</label>
              <select
                value={newTmpl.format_type}
                onChange={e => setNewTmpl(d => ({ ...d, format_type: e.target.value }))}
                style={{ padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--border-medium)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                <option value="grid">Grid (yatay — Dolap gibi)</option>
                <option value="vertical">Dikey (Sandviç gibi)</option>
              </select>
            </div>
            <button onClick={handleCreate} disabled={creating} className="btn-primary" style={{ padding: '7px 14px' }}>
              {creating ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
            <button onClick={() => setShowNew(false)} className="btn-secondary" style={{ padding: '7px 12px' }}>İptal</button>
          </div>
        )}
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
        {products.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ flex: 1, fontSize: 13, color: p.product_name ? 'var(--text-primary)' : 'var(--text-tertiary)', fontStyle: p.product_name ? 'normal' : 'italic' }}>
              {p.product_name || '— boşluk —'}
            </span>
            <button onClick={() => move(i, -1)} style={iconBtn} title="Yukarı">↑</button>
            <button onClick={() => move(i, 1)}  style={iconBtn} title="Aşağı">↓</button>
            <button onClick={() => remove(i)}   style={{ ...iconBtn, color: '#dc2626', borderColor: '#dc2626' }} title="Sil">✕</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={newProduct} onChange={e => setNewProduct(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addProduct()}
          placeholder="Ürün adı..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border-medium)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
        />
        <button onClick={addProduct} className="btn-secondary">+ Ürün</button>
        <button onClick={addSpacer} className="btn-secondary">+ Boşluk</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        {msg && <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{msg}</span>}
      </div>
    </div>
  )
}

// ── Rut Management Section ────────────────────────────────────────────────────
function RutSection() {
  const [ruts, setRuts] = useState([])
  const [editId, setEditId] = useState(null)
  const [editData, setEditData] = useState({ branch_name: '', rut_number: '' })
  const [newRut, setNewRut] = useState({ branch_name: '', rut_number: '' })
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState('')

  const loadRuts = useCallback(() => {
    getRuts().then(r => setRuts(r.data.data || [])).catch(() => {})
  }, [])

  useEffect(() => { loadRuts() }, [loadRuts])

  const startEdit = (rut) => { setEditId(rut.id); setEditData({ branch_name: rut.branch_name, rut_number: rut.rut_number }) }

  const saveEdit = async () => {
    try {
      await updateRut(editId, editData)
      setEditId(null); loadRuts()
    } catch { setMsg('Güncelleme hatası.') }
  }

  const handleDelete = async (id) => {
    if (!await confirmDialog('Silmek istediğinize emin misiniz?')) return
    try { await deleteRut(id); loadRuts() } catch { setMsg('Silme hatası.') }
  }

  const handleAdd = async () => {
    if (!newRut.branch_name.trim() || !newRut.rut_number) return
    try {
      await saveRut(newRut)
      setNewRut({ branch_name: '', rut_number: '' }); loadRuts()
    } catch { setMsg('Ekleme hatası.') }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true); setMsg('')
    try {
      const res = await importXlsm(file)
      const c = res.data.counts || {}
      setMsg(`Import tamam — Ruts: ${c.ruts || 0}, Dolap: ${c.dolap || 0}, Dondurma: ${c.dondurma || 0}, Sandviç: ${c.sandvic || 0}, Pasta: ${c.pasta || 0}`)
      loadRuts()
    } catch (err) {
      setMsg(err.response?.data?.error || 'Import hatası')
    } finally { setImporting(false); e.target.value = '' }
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontWeight: 700 }}>{ruts.length} şube</span>
        <label className="btn-secondary" style={{ cursor: 'pointer' }}>
          <i className="bi bi-file-earmark-excel" style={{ marginRight: 6 }} />
          {importing ? 'Import ediliyor...' : 'XLSM Import'}
          <input type="file" hidden accept=".xlsm,.xlsx" onChange={handleImport} disabled={importing} />
        </label>
      </div>

      {msg && <div style={{ padding: 10, background: 'var(--bg-main)', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      <div style={{ maxHeight: 400, overflowY: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-main)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Şube Adı</th>
              <th style={{ padding: '8px 12px', textAlign: 'center', width: 80 }}>Rut</th>
              <th style={{ width: 100 }} />
            </tr>
          </thead>
          <tbody>
            {ruts.map(rut => (
              <tr key={rut.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                {editId === rut.id ? (
                  <>
                    <td style={{ padding: '4px 8px' }}>
                      <input value={editData.branch_name} onChange={e => setEditData(d => ({ ...d, branch_name: e.target.value }))}
                        style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <input type="number" value={editData.rut_number} onChange={e => setEditData(d => ({ ...d, rut_number: e.target.value }))}
                        style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-medium)', background: 'var(--bg-main)', color: 'var(--text-primary)', textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                      <button onClick={saveEdit} className="btn-primary" style={{ padding: '4px 8px', fontSize: 12 }}>Kaydet</button>
                      <button onClick={() => setEditId(null)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, marginLeft: 4 }}>İptal</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '8px 12px' }}>{rut.branch_name}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{rut.rut_number}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <button onClick={() => startEdit(rut)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }}>Düzenle</button>
                      <button onClick={() => handleDelete(rut.id)} style={{ padding: '4px 8px', fontSize: 12, marginLeft: 4, background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}>Sil</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={newRut.branch_name} onChange={e => setNewRut(d => ({ ...d, branch_name: e.target.value }))}
          placeholder="Şube adı..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border-medium)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
        />
        <input
          type="number" value={newRut.rut_number} onChange={e => setNewRut(d => ({ ...d, rut_number: e.target.value }))}
          placeholder="Rut" style={{ width: 70, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border-medium)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
        />
        <button onClick={handleAdd} className="btn-primary">+ Ekle</button>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function DistributionTab() {
  const [subTab, setSubTab] = useState('generate')
  const { hasRole } = useAuthStore()
  const isAdmin = hasRole('admin')

  const tabs = [
    { key: 'generate', label: 'Liste Oluştur' },
    ...(isAdmin ? [
      { key: 'templates', label: 'Şablon Yönetimi' },
      { key: 'ruts',     label: 'Rut Yönetimi' },
    ] : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{
            padding: '7px 16px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
            background: subTab === t.key ? 'var(--primary)' : 'var(--bg-surface)',
            color: subTab === t.key ? 'white' : 'var(--text-secondary)',
            border: '1px solid var(--border-medium)',
          }}>{t.label}</button>
        ))}
      </div>

      {subTab === 'generate'  && <GenerateSection />}
      {subTab === 'templates' && isAdmin && <TemplateSection />}
      {subTab === 'ruts'      && isAdmin && <RutSection />}
    </div>
  )
}
