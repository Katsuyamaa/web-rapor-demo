import React, { useEffect, useState, createContext, useContext } from 'react'
import { useRoutes } from 'react-router-dom'
import useAuthStore from './store/authStore'
import routes from './router'
import { subscribeLoading } from './api/client'
import GlobalDialogs from './components/ui/GlobalDialogs'

export const DarkModeContext = createContext({ dark: false, toggle: () => {} })

export function useDarkMode() {
  return useContext(DarkModeContext)
}

export default function App() {
  const { init, isLoading } = useAuthStore()
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [isFetching, setIsFetching] = useState(false)

  useEffect(() => {
    const unsub = subscribeLoading(setIsFetching)
    return unsub
  }, [])

  useEffect(() => { init() }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggle = () => setDark(d => !d)

  if (isLoading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)',
      fontFamily: 'var(--sans)',
    }}>
      Yükleniyor...
    </div>
  )

  return (
    <DarkModeContext.Provider value={{ dark, toggle }}>
      {useRoutes(routes)}
      <GlobalDialogs />
      {isFetching && (
        <div style={{
          position: 'fixed', bottom: '1.25rem', right: '1.25rem',
          background: 'var(--primary, #2563eb)', color: '#fff',
          borderRadius: '999px', padding: '0.45rem 0.9rem',
          fontSize: '0.75rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 9999,
          animation: 'fadeIn 150ms ease',
        }}>
          <span style={{
            width: '10px', height: '10px', border: '2px solid rgba(255,255,255,0.4)',
            borderTopColor: '#fff', borderRadius: '50%',
            display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
          }} />
          Yükleniyor
        </div>
      )}
    </DarkModeContext.Provider>
  )
}
