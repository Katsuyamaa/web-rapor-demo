import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#b91c1c', background: '#fee2e2', borderRadius: '8px', margin: '1rem', border: '1px solid #fca5a5' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}><i className="bi bi-exclamation-triangle-fill"></i> Bileşen Yükleme Hatası</h3>
          <p style={{ marginBottom: '1rem', fontWeight: 600 }}>{this.state.error?.toString()}</p>
          <details style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', opacity: 0.8, background: 'rgba(255,255,255,0.5)', padding: '1rem', borderRadius: '4px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Teknik Detayları Göster</summary>
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      )
    }
    return this.props.children
  }
}
