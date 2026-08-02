import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import React from 'react'
import 'gridstack/dist/gridstack.min.css'
import { GridStack } from 'gridstack'
import useWidgetStore from '../../store/widgetStore'
import Widget from './Widget'
import Modal from '../ui/Modal'

// Per-widget error boundary
class WidgetErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-surface)', borderRadius: 12,
        border: '1px dashed var(--border-medium)', color: 'var(--text-tertiary)',
        fontSize: 12, padding: '1rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}><i className="bi bi-exclamation-triangle-fill"></i></div>
        Widget yüklenemedi
      </div>
    )
    return this.props.children
  }
}

const deleteButtonStyle = {
  position: 'absolute', top: 6, right: 6,
  background: '#ef4444', color: 'white', border: 'none',
  borderRadius: '50%', width: 22, height: 22,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, cursor: 'pointer', zIndex: 10, lineHeight: 1,
}

const editButtonStyle = {
  position: 'absolute', top: 6, right: 34,
  background: '#3b82f6', color: 'white', border: 'none',
  borderRadius: '50%', width: 22, height: 22,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, cursor: 'pointer', zIndex: 10, lineHeight: 1,
}

const dragHandleStyle = {
  position: 'absolute', top: 6, left: 8,
  color: '#94a3b8', fontSize: 16, cursor: 'move', zIndex: 10,
  userSelect: 'none',
}

const GS_OPTIONS = {
  margin: 8,
  column: 12,
  cellHeight: 44,
  float: true,
  disableOneColumnMode: false,
  columnOpts: { breakpoints: [{ w: 768, c: 1 }] },
  handle: '.drag-handle',
  animate: false,
  resizable: { handles: 'e, se, s, sw, w' },
}

// Portal-based GridLayout — GridStack owns the DOM, React renders into portals.
// This eliminates React/GridStack DOM reconciliation conflicts (nested widgets, etc.)
export default function GridLayout({ pageId, widgets, isEditable = false, onDelete, onEdit }) {
  const gridRef = useRef(null)
  const gsRef   = useRef(null)
  const { saveLayout } = useWidgetStore()
  const [hoveredId, setHoveredId]   = useState(null)
  const [portals, setPortals]       = useState([]) // [{id, el}]
  const [deleteTarget, setDeleteTarget] = useState(null) // {id, title}

  useEffect(() => {
    if (!gridRef.current) return

    // Destroy previous GridStack instance and its DOM children
    if (gsRef.current) {
      gsRef.current.off('change')
      gsRef.current.destroy(false) // false = keep container div, remove grid items
      gsRef.current = null
    }
    // Clear leftover DOM from previous instance
    if (gridRef.current) {
      gridRef.current.innerHTML = ''
    }
    setPortals([])

    if (widgets.length === 0) return

    // Init on the now-empty container
    gsRef.current = GridStack.init(
      { ...GS_OPTIONS, staticGrid: !isEditable, alwaysShowResizeHandle: isEditable },
      gridRef.current,
    )

    // Imperatively add each widget — GridStack creates and positions the DOM node
    const newPortals = []
    widgets.forEach(w => {
      // GridStack creates .grid-stack-item > .grid-stack-item-content
      const item = gsRef.current.addWidget({
        id:   String(w.id),
        x:    w.x  ?? 0,
        y:    w.y  ?? 0,
        w:    w.w  ?? 4,
        h:    w.h  ?? 4,
        minW: w.widget_type === 'chart' ? 3 : 2,
        minH: w.widget_type === 'chart' ? 4 : 2,
      })

      // Replace default empty content with a React-ready div
      const contentWrapper = item.querySelector('.grid-stack-item-content')
      if (contentWrapper) {
        const reactRoot = document.createElement('div')
        reactRoot.style.cssText = 'height:100%;width:100%;position:relative;overflow:hidden;'
        contentWrapper.appendChild(reactRoot)
        newPortals.push({ id: w.id, el: reactRoot })
      }
    })

    gsRef.current.on('change', () => {
      if (gsRef.current) saveLayout(pageId, gsRef.current.save())
    })

    setPortals(newPortals)

    return () => {
      setPortals([])
      if (gsRef.current) {
        gsRef.current.off('change')
        gsRef.current.destroy(false)
        if (gridRef.current) gridRef.current.innerHTML = ''
        gsRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, widgets.length])

  // Toggle drag/resize without reinit
  useEffect(() => {
    if (!gsRef.current) return
    gsRef.current.setStatic(!isEditable)
  }, [isEditable])

  function handleDelete(e, widget) {
    e.stopPropagation()
    setDeleteTarget({ id: widget.id, title: widget.title })
  }

  function confirmDelete() {
    if (deleteTarget) onDelete?.(deleteTarget.id)
    setDeleteTarget(null)
  }

  function handleEdit(e, widget) {
    e.stopPropagation()
    onEdit?.(widget)
  }

  const showActions = id => onDelete && (isEditable || hoveredId === id)

  return (
    <>
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Widget Sil" maxWidth={400}>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.title}</strong> widget'ını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteTarget(null)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--bg-hover)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
          >
            İptal
          </button>
          <button
            onClick={confirmDelete}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
          >
            Sil
          </button>
        </div>
      </Modal>

      {/* GridStack owns this div's children — we never render React children here */}
      <div className="grid-stack" ref={gridRef} />

      {/* React widget content rendered via portals into GridStack-managed DOM nodes */}
      {portals.map(({ id, el }) => {
        const widget = widgets.find(w => w.id === id)
        if (!widget || !el) return null
        return createPortal(
          <div
            style={{ height: '100%', position: 'relative' }}
            onMouseEnter={() => setHoveredId(id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <WidgetErrorBoundary key={id}>
              <Widget widget={widget} />
            </WidgetErrorBoundary>
            {showActions(id) && (
              <>
                <button style={deleteButtonStyle} onClick={e => handleDelete(e, widget)}><i className="bi bi-x-lg"></i></button>
                {onEdit && (
                  <button style={editButtonStyle} onClick={e => handleEdit(e, widget)}><i className="bi bi-pencil"></i></button>
                )}
              </>
            )}
            {isEditable && (
              <span className="drag-handle" style={dragHandleStyle}><i className="bi bi-arrows-move"></i></span>
            )}
          </div>,
          el,
          String(id),
        )
      })}
    </>
  )
}
