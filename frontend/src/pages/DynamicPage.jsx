import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import usePageStore from '../store/pageStore'
import useWidgetStore from '../store/widgetStore'
import GridLayout from '../components/dashboard/GridLayout'
import PageCard from '../components/ui/PageCard'
import ErrorBoundary from '../components/ui/ErrorBoundary'

export default function DynamicPage() {
  const params   = useParams()
  const navigate = useNavigate()
  const slug     = params['*']?.split('/').filter(Boolean).pop() || ''

  const { fetchPage, activePage, getBreadcrumb, tree } = usePageStore()
  const { widgetsByPage, fetchWidgets, removeWidget }  = useWidgetStore()

  const [editMode, setEditMode] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (slug) {
      usePageStore.setState({ activePage: null })
      setEditMode(false)
      fetchPage(slug)
    }
  }, [slug, fetchPage])

  useEffect(() => {
    if (activePage?.id) fetchWidgets(activePage.id)
  }, [activePage?.id, fetchWidgets])

  async function handleDeleteWidget(widgetId) {
    const pageId = activePage?.id
    if (!pageId || deletingId === widgetId) return
    setDeletingId(widgetId)
    try {
      await removeWidget(pageId, widgetId)
    } finally {
      setDeletingId(null)
    }
  }

  if (!activePage) {
    return (
      <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-tertiary)' }}>
        Sayfa yükleniyor...
      </div>
    )
  }

  const breadcrumb = getBreadcrumb(activePage)
  const widgets    = widgetsByPage[activePage.id] || []
  const childPages = tree.filter(p => p.parent_id === activePage.id)

  return (
    <div className="fade-in">
      {/* Breadcrumb */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-tertiary)', flexWrap: 'wrap' }}>
        <Link className="pressable" to="/" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>Anasayfa</Link>
        {breadcrumb.map(p => (
          <span key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>/</span>
            <Link
              to={p.slug === 'home' ? '/' : `/p/${p.slug}`}
              className="pressable"
              style={{
                color: p.id === activePage.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontWeight: p.id === activePage.id ? 600 : 500,
              }}
            >
              {p.title}
            </Link>
          </span>
        ))}
      </nav>

      {/* Başlık + Edit butonları */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{activePage.title}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {editMode ? (
            <>
              <button
                className="pressable"
                onClick={() => navigate(`/dashboard/ekle?page=${encodeURIComponent(activePage.slug)}`)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem',
                  background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600,
                }}
              >
                + Widget Ekle
              </button>
              <button
                className="pressable"
                onClick={() => setEditMode(false)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem',
                  background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', fontWeight: 600,
                }}
              >
                <i className="bi bi-check-lg"></i> Bitti
              </button>
            </>
          ) : (
            <button
              className="pressable"
              onClick={() => setEditMode(true)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem',
                background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-medium)', fontWeight: 600,
              }}
            >
              <i className="bi bi-pencil-square"></i> Düzenle
            </button>
          )}
        </div>
      </div>

      {/* Alt sayfalar */}
      {childPages.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize:'0.85rem', color:'var(--text-tertiary)', marginBottom:'1.25rem', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight: 700 }}>Alt Bölümler</h2>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
            gap: '1.5rem'
          }}>
            {childPages.map(p => <PageCard key={p.id} page={p} />)}
          </div>
        </section>
      )}

      {/* Widget grid */}
      {widgets.length > 0 && (
        <ErrorBoundary>
          <GridLayout
            key={activePage.id}
            pageId={activePage.id}
            widgets={widgets.filter(w => !w.parent_widget_id)}
            isEditable={editMode}
            onDelete={handleDeleteWidget}
            onEdit={(widget) => {
              const slug = activePage?.slug
              navigate(`/dashboard/ekle?page=${slug}&edit=${widget.id}`)
            }}
          />
        </ErrorBoundary>
      )}

      {widgets.length === 0 && childPages.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-tertiary)',
          border: '2px dashed var(--border-medium)', borderRadius: '16px', background: 'var(--bg-surface)',
          marginTop: '2rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem', opacity: 0.5 }}><i className="bi bi-inbox"></i></div>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Burası biraz boş görünüyor</h3>
          <div style={{ marginBottom: '1.5rem' }}>Bu sayfada henüz içerik yok. Düzenle moduna geçerek yeni panel ekleyebilirsiniz.</div>
          {editMode && (
            <button
              className="pressable"
              onClick={() => navigate(`/dashboard/ekle?page=${encodeURIComponent(activePage.slug)}`)}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '10px', background: 'var(--accent-primary)',
                color: 'white', border: 'none', fontWeight: 600, fontSize: '0.9rem',
              }}
            >
              + İlk Widget'ı Ekle
            </button>
          )}
        </div>
      )}
    </div>
  )
}
