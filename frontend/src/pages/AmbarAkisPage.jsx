import { useState, useEffect } from 'react'
import client from '../api/client'
import MultiSelect from '../components/ui/MultiSelect'

const labelStyle = {
  fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block',
}
const inputStyle = {
  width: '100%', padding: '0.6rem 0.8rem', border: '1.5px solid var(--border-medium)',
  borderRadius: 8, fontSize: '0.875rem', background: 'var(--bg-surface)',
  color: 'var(--text-primary)', outline: 'none',
}
const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
}

const DIM_LABELS = {
  tarih_ay:     'Tarih (Ay)',
  tarih_gun:    'Tarih (Gün)',
  cikis_ambari: 'Çıkış Ambarı',
  giris_ambari: 'Giriş Ambarı',
}

const ROW_OPTIONS = ['tarih_ay', 'tarih_gun', 'cikis_ambari', 'giris_ambari']
const COL_OPTIONS = ['cikis_ambari', 'giris_ambari', 'tarih_ay', 'tarih_gun']

export default function AmbarAkisPage() {
  const [start, setStart]           = useState('')
  const [end, setEnd]               = useState('')
  const [cikis, setCikis]           = useState([])
  const [giris, setGiris]           = useState([])
  const [stok,  setStok]            = useState([])
  const [rowBy, setRowBy]           = useState('tarih_ay')
  const [colBy, setColBy]           = useState('cikis_ambari')
  const [filterOpts, setFilterOpts] = useState({ cikis_ambari: [], giris_ambari: [], stok_adi: [] })
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(false)

  useEffect(() => {
    client.get('/filters').then(r => {
      setFilterOpts({
        cikis_ambari: r.data.cikis_ambari || [],
        giris_ambari: r.data.giris_ambari || [],
        stok_adi:     r.data.stok_adi     || [],
      })
    }).catch(() => {})
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const params = { start, end, row_by: rowBy, col_by: effectiveColBy }
      if (cikis.length) params.cikis = cikis.join(',')
      if (giris.length) params.giris = giris.join(',')
      if (stok.length)  params.stok  = stok.join(',')
      const res = await client.get('/ambar_akis', { params })
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }

  const fmt = v => '₺' + Number(v).toLocaleString('tr-TR')

  const satirlar = data?.satirlar || []
  const sutunlar = data?.sutunlar || []
  const matris   = data?.matris   || {}
  const maxTutar = data?.max_tutar || 0

  const rowTotals = satirlar.map(r =>
    sutunlar.reduce((acc, c) => acc + (matris[r]?.[c]?.tutar || 0), 0)
  )
  const colTotals = sutunlar.map(c =>
    satirlar.reduce((acc, r) => acc + (matris[r]?.[c]?.tutar || 0), 0)
  )
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0)

  const availableColOptions = COL_OPTIONS.filter(o => o !== rowBy)
  const effectiveColBy = availableColOptions.includes(colBy) ? colBy : availableColOptions[0]

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
        Ambar Akış Haritası
      </h1>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
        Transfer tutarlarını seçilen boyutlara göre ısı haritası olarak gösterir.
      </p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 140 }}>
          <label style={labelStyle}>Başlangıç</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={labelStyle}>Bitiş</label>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ minWidth: 160 }}>
          <label style={labelStyle}>Satır Boyutu ↓</label>
          <select value={rowBy} onChange={e => setRowBy(e.target.value)} style={selectStyle}>
            {ROW_OPTIONS.map(o => (
              <option key={o} value={o}>{DIM_LABELS[o]}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 160 }}>
          <label style={labelStyle}>Sütun Boyutu →</label>
          <select
            value={effectiveColBy}
            onChange={e => setColBy(e.target.value)}
            style={selectStyle}
          >
            {availableColOptions.map(o => (
              <option key={o} value={o}>{DIM_LABELS[o]}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 200 }}>
          <label style={labelStyle}>Çıkış Ambarı</label>
          <MultiSelect options={filterOpts.cikis_ambari} value={cikis} onChange={setCikis} />
        </div>
        <div style={{ minWidth: 200 }}>
          <label style={labelStyle}>Giriş Ambarı</label>
          <MultiSelect options={filterOpts.giris_ambari} value={giris} onChange={setGiris} />
        </div>
        <div style={{ minWidth: 200 }}>
          <label style={labelStyle}>Stok Adı</label>
          <MultiSelect options={filterOpts.stok_adi} value={stok} onChange={setStok} />
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '0.6rem 1.4rem', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            alignSelf: 'flex-end',
          }}
        >
          {loading ? 'Hesaplanıyor...' : 'Hesapla'}
        </button>
      </div>

      {data && satirlar.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Seçilen filtreler için veri bulunamadı
        </div>
      )}

      {data && satirlar.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border-medium)' }}>
          <table style={{ borderCollapse: 'collapse', background: 'var(--bg-surface)', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th style={{
                  padding: '8px 12px', background: 'var(--bg-main)', fontWeight: 700,
                  color: 'var(--text-tertiary)', textAlign: 'center', whiteSpace: 'nowrap',
                  borderBottom: '1px solid var(--border-medium)', borderRight: '1px solid var(--border-medium)',
                  fontSize: 11, letterSpacing: '0.03em',
                }}>
                  {DIM_LABELS[rowBy]} ↓ / {DIM_LABELS[effectiveColBy]} →
                </th>
                {sutunlar.map(col => (
                  <th key={col} style={{
                    padding: '8px 12px', background: 'var(--bg-main)', fontWeight: 700,
                    color: 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--border-medium)', borderRight: '1px solid var(--border-medium)',
                    fontSize: 11,
                  }}>
                    {col}
                  </th>
                ))}
                <th style={{
                  padding: '8px 12px', background: 'var(--border-medium)', fontWeight: 700,
                  color: 'var(--text-secondary)', textAlign: 'center', whiteSpace: 'nowrap',
                  borderBottom: '1px solid var(--border-medium)',
                  fontSize: 11,
                }}>
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((row, ri) => (
                <tr key={ri}>
                  <td style={{
                    padding: '7px 12px', fontWeight: 700, color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-light)',
                    borderRight: '1px solid var(--border-medium)', background: 'var(--bg-main)',
                  }}>
                    {row}
                  </td>
                  {sutunlar.map(col => {
                    const cell = matris[row]?.[col]
                    const tutar = cell?.tutar || 0
                    const opacity = maxTutar > 0 ? (tutar / maxTutar) * 0.8 : 0
                    return (
                      <td
                        key={col}
                        title={tutar > 0 ? `${row} → ${col}: ${Number(cell.miktar).toLocaleString('tr-TR')} birim, ${cell.evrak_sayisi} evrak` : undefined}
                        style={{
                          padding: '7px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-light)',
                          borderRight: '1px solid var(--border-light)',
                          background: tutar > 0 ? `rgba(59,130,246,${opacity})` : 'var(--bg-surface)',
                          color: tutar > 0 ? (opacity > 0.5 ? '#1e3a5f' : 'var(--text-primary)') : 'var(--text-tertiary)',
                        }}
                      >
                        {tutar > 0 ? fmt(tutar) : '—'}
                      </td>
                    )
                  })}
                  <td style={{
                    padding: '7px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap', fontWeight: 700, background: 'var(--border-medium)',
                    color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)',
                  }}>
                    {fmt(rowTotals[ri])}
                  </td>
                </tr>
              ))}
              <tr style={{ background: 'var(--border-medium)' }}>
                <td style={{
                  padding: '7px 12px', fontWeight: 700, color: 'var(--text-primary)',
                  borderTop: '1px solid var(--border-medium)', borderRight: '1px solid var(--border-medium)',
                }}>
                  Toplam
                </td>
                {colTotals.map((total, ci) => (
                  <td key={sutunlar[ci]} style={{
                    padding: '7px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700, whiteSpace: 'nowrap', color: 'var(--text-primary)',
                    borderTop: '1px solid var(--border-medium)', borderRight: '1px solid var(--border-light)',
                  }}>
                    {fmt(total)}
                  </td>
                ))}
                <td style={{
                  padding: '7px 14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  fontWeight: 800, whiteSpace: 'nowrap', color: 'var(--text-primary)',
                  borderTop: '1px solid var(--border-medium)',
                }}>
                  {fmt(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Filtre seçip <strong>Hesapla</strong> butonuna bas.
        </div>
      )}
    </div>
  )
}
