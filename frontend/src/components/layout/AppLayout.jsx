import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import usePageStore from '../../store/pageStore'
import useAuthStore from '../../store/authStore'
import ToastContainer from '../ui/Toast'
import SupportBubble from './SupportBubble'

export default function AppLayout() {
  const { fetchTree }   = usePageStore()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => { fetchTree() }, [])

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', background: 'var(--bg-main)', overflow: 'hidden' }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
          className="mobile-only"
        />
      )}

      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content" style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '1.5rem 2rem',
        minWidth: 0,
        position: 'relative',
        boxSizing: 'border-box',
        paddingBottom: '3rem', // Extra space at the bottom to prevent cutoff
      }}>
        {/* Mobile top bar — hamburger + logo */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'var(--text-primary)', lineHeight: 1,
            }}>
            <i className="bi bi-list"></i></button>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Örnek<span style={{ color: '#2563eb' }}>Gıda</span>
          </span>
        </div>

        <Outlet />
      </main>

      <ToastContainer />
      <SupportBubble isLoggedIn={isAuthenticated} />
    </div>
  )
}
