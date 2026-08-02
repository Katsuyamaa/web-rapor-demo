import { useEffect, useState } from 'react'
import client from '../../api/client'

export default function SystemStatus() {
  const [data, setData] = useState(null)

  const load = async () => {
    try {
      const res = await client.get('/system/metrics')
      setData(res.data)
    } catch {}
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  if (!data) return null

  const Bar = ({ pct, color }) => (
    <div style={{ background: 'var(--border-medium)', borderRadius: '4px', height: '4px', marginTop: '2px' }}>
      <div style={{
        width: `${Math.min(pct, 100)}%`,
        background: color, height: '4px', borderRadius: '4px',
        transition: 'width 0.4s',
      }} />
    </div>
  )

  return (
    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-medium)', fontSize: '0.78rem', flexShrink: 0 }}>
      <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Sunucu Durumu</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.cpu_percent}%</div>
          <div style={{ color: 'var(--text-tertiary)' }}>CPU</div>
          <Bar pct={data.cpu_percent} color="#3b82f6" />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.ram_percent}%</div>
          <div style={{ color: 'var(--text-tertiary)' }}>RAM</div>
          <Bar pct={data.ram_percent} color="#10b981" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.disk_used_gb}/{data.disk_total_gb} GB</div>
          <div style={{ color: 'var(--text-tertiary)' }}>Disk</div>
          <Bar pct={data.disk_percent} color="#f59e0b" />
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
        marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-medium)',
      }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{(data.doc_count || 0).toLocaleString('tr-TR')}</div>
          <div style={{ color: 'var(--text-tertiary)' }}>Belge</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.user_count || 0}</div>
          <div style={{ color: 'var(--text-tertiary)' }}>Kullanıcı</div>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <div style={{ color: 'var(--text-tertiary)' }}>Son Yükleme</div>
          <div style={{ fontWeight: 700, fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{data.last_upload || '—'}</div>
        </div>
      </div>
    </div>
  )
}
