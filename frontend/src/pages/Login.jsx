import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuthStore()
  const navigate                = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Kullanıcı adı veya şifre hatalı')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    border: '1.5px solid var(--border-medium)',
    borderRadius: '10px', fontSize: '0.95rem',
    background: 'var(--bg-surface)', color: 'var(--text-primary)',
    outline: 'none', transition: 'border-color 150ms, box-shadow 150ms',
    boxSizing: 'border-box', fontFamily: 'var(--sans)',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', width: '100%', background: 'var(--bg-main)', fontFamily: 'var(--sans)',
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '40vh',
        background: 'linear-gradient(135deg,#2563eb,#06b6d4)', opacity: 0.08, zIndex: 0,
      }} />

      <div style={{
        background: 'var(--bg-surface)', borderRadius: '16px', width: '100%', maxWidth: '400px',
        padding: '2.5rem 2rem', boxShadow: 'var(--shadow-float)',
        border: '1px solid var(--border-medium)', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          position: 'absolute', top: '0.75rem', right: '0.75rem',
          background: 'rgba(37,99,235,0.12)', color: '#2563eb',
          border: '1px solid rgba(37,99,235,0.25)', borderRadius: '999px',
          padding: '0.3rem 0.7rem', fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.01em', whiteSpace: 'nowrap',
        }} title="Bu bir portfolyo demosudur">
          Demo Giriş: demo / demo
        </div>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px', height: '52px', margin: '0 auto 1rem',
            background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(37,99,235,0.4)', fontSize: '1.5rem', color: 'white'
          }}>
            <i className="bi bi-bar-chart-fill"></i>
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Örnek Gıda A.Ş.
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem',
              fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Kullanıcı Adı
            </label>
            <input
              value={username} onChange={e => setUsername(e.target.value)}
              style={inputStyle} autoFocus required
              onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{
              display: 'block', marginBottom: '0.4rem', fontSize: '0.78rem',
              fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Şifre
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle} required
              onFocus={e => { e.target.style.borderColor = '#2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.15)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: '1rem', padding: '0.75rem 1rem',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px', color: '#dc2626', fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading} className="btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', borderRadius: '10px' }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
