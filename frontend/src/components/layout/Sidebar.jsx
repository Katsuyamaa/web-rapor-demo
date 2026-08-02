import { useState, useContext, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import usePageStore from '../../store/pageStore'
import SystemStatus from '../ui/SystemStatus'
import Modal from '../ui/Modal'
import { DarkModeContext } from '../../App'
import useSupportStore from '../../store/supportStore'
import useAlarmStore from '../../store/alarmStore'
import client from '../../api/client'

const APP_VERSION = 'v0.0.25'

const CHANGELOG = [
  {
    version: 'v0.0.25',
    date: '2026-05-16',
    items: [
      { type: 'new', text: 'Mimari Güvenlik — JWT tokenlar localStorage\'dan güvenli HttpOnly Cookie yapısına taşındı (XSS koruması)' },
      { type: 'new', text: 'Dinamik Şube Yönetimi — 500+ şube verisi kod içerisinden veritabanına taşındı; ERP veri çekme sistemi dinamik hale getirildi' },
      { type: 'new', text: 'Modern Dialog Sistemi — window.confirm/prompt uyarıları yerine modern, asenkron ve şık modal pencereleri eklendi' },
      { type: 'fix', text: 'API Güvenliği — Unbounded query (sınırsız sorgu) açığı kapatıldı, log limitleri ve parametre doğrulamaları eklendi' },
      { type: 'fix', text: 'Race Condition — Eş zamanlı ERP veri çekme çakışmaları MySQL GET_LOCK mekanizması ile engellendi' },
      { type: 'fix', text: 'Sistem Kararlılığı — Frontend ve backenddeki sessiz hata yutma (empty catch) blokları temizlendi ve loglama eklendi' },
    ],
  },
  {
    version: 'v0.0.24',
    date: '2026-05-14',
    items: [
      { type: 'new', text: 'Alarm Yönetimi — kullanıcı tanımlı eşik kuralları (threshold) ve IQR sapma alarmları; ambar/stok bazlı filtreleme destekli' },
      { type: 'new', text: 'Alarm motoru — günlük ERP yüklemesinden sonra ve her sabah 09:00\'da otomatik alarm kontrolü çalışır' },
      { type: 'new', text: 'Alarm geçmişi — tetiklenen alarmlar tarihçesi, okunmamış badge ve toplu okundu işaretleme' },
      { type: 'new', text: 'Sidebar alarm badge — okunmamış alarm sayısını gerçek zamanlı gösterir' },
      { type: 'new', text: 'Yükleniyor badge iyileştirmesi — tüm sayfalarda blur arka plan ile tutarlı yükleme göstergesi' },
    ],
  },
  {
    version: 'v0.0.23',
    date: '2026-05-12',
    items: [
      { type: 'new', text: 'Ciro Karşılaştırması sayfası — bu yıl vs geçen yıl ciro karşılaştırması; gün/hafta/ay granülarity, ambar filtresi, bar chart ve KPI kartları' },
      { type: 'new', text: 'Ciro Karşılaştırması — tarih aralığı seçici (bugün/bu hafta/bu ay/geçen ay/son 30 gün/bu yıl/özel) eklendi' },
      { type: 'fix', text: 'Ciro Karşılaştırması backend optimizasyonu — 6 ayrı sorgu yerine 3 CASE WHEN sorgusuna indirildi, zaman aşımı riski ortadan kalktı' },
    ],
  },
  {
    version: 'v0.0.22',
    date: '2026-05-11',
    items: [
      { type: 'new', text: 'Destek Talebi sistemi — kullanıcılar hata/istek/soru talebi oluşturabiliyor; admin yanıt verebiliyor' },
      { type: 'new', text: 'SupportBubble — sağ alt köşede canlı chat widget; sidebar\'daki kulaklık butonu ile açılıyor' },
      { type: 'new', text: 'Admin Talepler sekmesi — tüm talepleri kullanıcı adıyla listeler, durum değiştirme, yanıt ve silme' },
      { type: 'new', text: 'Yapılacaklar (Roadmap) sekmesi — admin durum/öncelik/kategori bazlı özellik yol haritası yönetimi' },
      { type: 'new', text: 'Canlı Rapor grafik tip değişince soluk renk hatası düzeltildi — fill type sıfırlama + key remount' },
      { type: 'new', text: 'Sidebar hover renkleri — her bölüm için ayrı renk vurgusu (mavi, indigo, mor, camgöbeği, amber, kırmızı)' },
      { type: 'fix', text: 'Admin destek panelinde talepler yanlışlıkla "Taleplerim" başlığıyla ve kendi talebi gibi görünüyordu — düzeltildi' },
      { type: 'fix', text: 'Admin destek balonunda "Yeni Talep" butonu gizlendi; talepler kullanıcı adı ve zamanla listeleniyor' },
      { type: 'fix', text: 'Kullanıcılar birbirlerinin taleplerini göremez; backend\'de user_id filtreleme ve _can_view koruması mevcut' },
    ],
  },
  {
    version: 'v0.0.21',
    date: '2026-05-11',
    items: [
      { type: 'new', text: 'ERP Scheduler — aralıklı mod (her N dakikada bir sil+yaz), anında ilk çalıştırma, "Şimdi Çalıştır" butonu' },
      { type: 'new', text: 'Scheduler durum göstergesi — APScheduler job kaydı, sonraki çalışma saati ve geri sayım sayacı (TR saatine göre)' },
      { type: 'fix', text: 'Scheduler setup_scheduler() artık yalnızca ERP jobunu kaldırıyor; eski hâli tüm jobları (sipariş dahil) siliyordu' },
      { type: 'fix', text: 'interval_minutes kolonu app.py init_db migration eksikliği düzeltildi — DB kurulumu db_setup.py çalıştırılmadan yapılınca scheduler patlaması engellenli' },
      { type: 'fix', text: 'Scheduler sayı inputları onBlur yerine Kaydet butonu ile kaydediliyor; hızlı checkbox+input geçişlerindeki race condition giderildi' },
      { type: 'fix', text: 'Canlı Rapor sayfası varsayılan dönemi "Bu Ay" yerine "Bugün" olarak değiştirildi' },
    ],
  },
  {
    version: 'v0.0.2',
    date: '2026-05-10',
    items: [
      { type: 'new', text: 'Ambar Akış Haritası — dinamik pivot: satır ve sütun boyutunu (Tarih/Çıkış Ambarı/Giriş Ambarı) kullanıcı seçer, varsayılan Tarih (Ay) × Çıkış Ambarı' },
      { type: 'fix', text: 'ABC Analizi ve Sapma Raporu sayfaları kaldırıldı — geliştirme sürecinden çıkarıldı' },
      { type: 'fix', text: 'Proje dosya yapısı temizlendi — kök dizindeki scriptler, dokümanlar ve veri dosyaları düzenli klasörlere taşındı' },
    ],
  },
  {
    version: 'v0.0.1',
    date: '2026-05-09',
    items: [
      { type: 'new', text: 'Widget grafik eşik çizgisi — sürüklenebilir medyan çizgisi, kırmızı/yeşil bölgeler ve bar renklendirme' },
      { type: 'new', text: 'PNG ve CSV dışa aktarma — her grafik widgetında tek tıkla indirme' },
      { type: 'new', text: 'Ambar Akış Haritası sayfası — kaynaktan hedefe pivot ısı haritası' },
      { type: 'new', text: 'Sipariş Takibi sayfası — sipariş bazlı durum ve teslim takibi' },
      { type: 'new', text: 'ABC Analizi sayfası — ürün ve ambar bazlı Pareto analizi' },
      { type: 'new', text: 'Sapma Raporu sayfası — beklenen/gerçekleşen karşılaştırma' },
      { type: 'fix', text: 'Çoklu seri limiti kaldırıldı — artık data_limit ayarıyla tam kontrol (ör. 16 ambar)' },
      { type: 'fix', text: 'Grafik tooltip iyileştirmesi — kolon alanının tamamında hover ile görünür' },
      { type: 'fix', text: 'X ekseni etiket açısı ayarı — Otomatik, 0°, -30°, -45°, -90° veya özel açı' },
      { type: 'fix', text: 'Widget renk paleti kaydı ve önizleme tutarlılığı düzeltildi' },
      { type: 'fix', text: 'Widget silme onayı artık düzgün modal ile soruluyor' },
    ],
  },
]

const typeStyle = {
  new:  { label: 'YENİ',  bg: 'rgba(34,197,94,0.15)',  color: '#16a34a' },
  fix:  { label: 'DÜZELT', bg: 'rgba(59,130,246,0.15)', color: '#2563eb' },
  break:{ label: 'KIRICI', bg: 'rgba(239,68,68,0.15)',  color: '#dc2626' },
}

function ChangelogModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={`Sürüm Notları — ${APP_VERSION}`} maxWidth={540}>
      <div style={{ maxHeight: '65vh', overflowY: 'auto', paddingRight: '2px' }}>
        {CHANGELOG.map(release => (
          <div key={release.version}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{release.version}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{release.date}</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {release.items.map((item, i) => {
                const ts = typeStyle[item.type] || typeStyle.fix
                return (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    <span style={{
                      flexShrink: 0, fontSize: '0.65rem', fontWeight: 700,
                      background: ts.bg, color: ts.color,
                      borderRadius: '4px', padding: '2px 5px', marginTop: '2px',
                    }}>
                      {ts.label}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  )
}

const S_TEXT         = 'var(--sidebar-text)'
const S_TEXT_ACTIVE  = 'var(--sidebar-text-active)'
const S_TEXT_HOVER   = 'var(--sidebar-text-hover)'
const S_BORDER       = 'var(--sidebar-border)'
const S_BTN_BG       = 'var(--sidebar-btn-bg)'

function PageTreeItem({ page, depth = 0, isCollapsed, onClose }) {
  const loc = useLocation()
  const href = page.slug === 'home' ? '/' : `/p/${page.slug}`
  const active = loc.pathname === href

  const paddingLeft = isCollapsed ? '0' : `${0.75 + depth * 1}rem`

  return (
    <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
      <Link to={href} onClick={onClose} className="pressable nav-hover-indigo" style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: `0.5rem ${isCollapsed ? '0' : '0.75rem'}`,
        paddingLeft,
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        borderRadius: '7px', textDecoration: 'none',
        background: active ? 'rgba(37,99,235,0.3)' : 'transparent',
        color: active ? S_TEXT_ACTIVE : S_TEXT,
        fontWeight: active ? 600 : 400,
        fontSize: '0.87rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {active && !isCollapsed && (
          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />
        )}
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{page.icon || <i className="bi bi-file-earmark-text"></i>}</span>
        <span style={{
          whiteSpace: 'nowrap',
          opacity: isCollapsed ? 0 : 1,
          width: isCollapsed ? 0 : 'auto',
          transition: 'opacity 200ms, width 200ms',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {page.title}
        </span>
      </Link>
    </li>
  )
}

function AdminLink({ to, icon, label, isCollapsed, onClose, hoverClass = 'nav-hover-blue' }) {
  const loc = useLocation()
  const active = loc.pathname === to
  return (
    <Link to={to} onClick={onClose} className={`pressable ${hoverClass}`} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: `0.6rem ${isCollapsed ? '0' : '0.75rem'}`,
      justifyContent: isCollapsed ? 'center' : 'flex-start',
      borderRadius: '8px', textDecoration: 'none',
      background: active ? 'rgba(37,99,235,0.35)' : 'transparent',
      color: active ? S_TEXT_ACTIVE : S_TEXT,
      fontSize: '0.9rem', fontWeight: 400,
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      {!isCollapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </Link>
  )
}

function PagesMenu({ pages, isCollapsed, onClose, nested = false }) {
  const [open, setOpen] = useState(false)

  if (isCollapsed) return null

  if (nested) {
    // Filtreler içinde: kendi başlık butonu olan alt açılır menü
    return (
      <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
        <button onClick={() => setOpen(v => !v)} className="pressable nav-hover-indigo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.5rem 0.75rem', borderRadius: '7px', background: 'transparent', border: 'none', cursor: 'pointer', color: S_TEXT, fontSize: '0.87rem', textAlign: 'left' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}><i className="bi bi-folder2-open"></i></span>
          <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Raporlar</span>
          <i className="bi bi-chevron-down" style={{ fontSize: '0.7rem', opacity: 0.5, transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }}></i>
        </button>
        {open && (
          <ul style={{ listStyle: 'none', padding: '2px 0 4px 0.75rem', margin: '0 0 0 0.9rem', borderLeft: `1px solid ${S_BORDER}` }}>
            {pages.length === 0 && (
              <li style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: S_TEXT, opacity: 0.45 }}>Henüz rapor eklenmedi</li>
            )}
            {pages.map(p => <PageTreeItem key={p.id} page={p} depth={0} isCollapsed={false} onClose={onClose} />)}
          </ul>
        )}
      </li>
    )
  }

  return (
    <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="pressable nav-hover-indigo"
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: S_TEXT, fontSize: '0.9rem', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}><i className="bi bi-folder2-open"></i></span>
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Raporlar</span>
        <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem', opacity: 0.5, transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'none' }}></i>
      </button>

      {open && (
        <ul style={{ listStyle: 'none', padding: '2px 0 4px 0.75rem', margin: '0 0 0 0.9rem', borderLeft: `1px solid ${S_BORDER}` }}>
          {pages.length === 0 && (
            <li style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: S_TEXT, opacity: 0.45 }}>
              Henüz rapor eklenmedi
            </li>
          )}
          {pages.map(p => <PageTreeItem key={p.id} page={p} depth={0} isCollapsed={false} onClose={onClose} />)}
        </ul>
      )}
    </li>
  )
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout, hasRole, hasPermission } = useAuthStore()
  const { tree } = usePageStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [devOpen, setDevOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_dev_open') === 'true' } catch { return false }
  })
  const toggleDev = () => setDevOpen(v => {
    const next = !v
    try { localStorage.setItem('sidebar_dev_open', String(next)) } catch {}
    return next
  })
  const [filtersOpen, setFiltersOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_filters_open') !== 'false' } catch { return true }
  })
  const toggleFilters = () => setFiltersOpen(v => {
    const next = !v
    try { localStorage.setItem('sidebar_filters_open', String(next)) } catch {}
    return next
  })
  const [costOpen, setCostOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_cost_open') === 'true' } catch { return false }
  })
  const toggleCost = () => setCostOpen(v => {
    const next = !v
    try { localStorage.setItem('sidebar_cost_open', String(next)) } catch {}
    return next
  })
  const [costEnvOpen, setCostEnvOpen] = useState(() => {
    try { return localStorage.getItem('sidebar_cost_env_open') === 'true' } catch { return false }
  })
  const toggleCostEnv = () => setCostEnvOpen(v => {
    const next = !v
    try { localStorage.setItem('sidebar_cost_env_open', String(next)) } catch {}
    return next
  })
  const { dark, toggle: toggleDark } = useContext(DarkModeContext)
  const toggleSupport = useSupportStore(s => s.toggle)
  const { unreadCount, setUnreadCount } = useAlarmStore()

  useEffect(() => {
    client.get('/alarms/logs?unread=true')
      .then(r => setUnreadCount(r.data?.count || 0))
      .catch(() => {})
  }, [])
  
  // Sadece ana sayfalar (parent'ı olmayanlar)
  const rootPages = tree.filter(p => !p.parent_id && p.slug !== 'home')
  
  const loc = useLocation()

  const sidebarWidth = isCollapsed ? '72px' : '260px'

  return (
    <>
    <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    <aside style={{
      width: sidebarWidth, minWidth: sidebarWidth,
      background: 'var(--bg-sidebar)',
      borderRight: `1px solid ${S_BORDER}`,
      display: 'flex', flexDirection: 'column', height: '100vh',
      transition: 'width 300ms cubic-bezier(0.23,1,0.32,1), transform 300ms cubic-bezier(0.23,1,0.32,1)',
      flexShrink: 0, zIndex: 50, overflowX: 'hidden',
    }}
    className={`sidebar-root${mobileOpen ? ' sidebar-mobile-open' : ''}`}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.25rem', borderBottom: `1px solid ${S_BORDER}`,
        display: 'flex', alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
      }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--sidebar-text-active)', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
              Örnek<span style={{ color: '#60a5fa' }}>Gıda</span>
            </span>
            <button
              onClick={() => setChangelogOpen(true)}
              title="Sürüm notlarını gör"
              style={{
                background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.3)',
                color: '#60a5fa', borderRadius: '5px', padding: '1px 6px',
                fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.02em', lineHeight: '1.6', whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {APP_VERSION}
            </button>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="pressable"
          style={{
            background: S_BTN_BG, border: 'none', color: S_TEXT_HOVER,
            padding: '0.4rem 0.5rem', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '1.2rem',
          }}
        >
          {isCollapsed ? <i className="bi bi-layout-sidebar-inset"></i> : <i className="bi bi-layout-sidebar-inset-reverse"></i>}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', overflowX: 'hidden' }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>

          {/* Canlı Rapor — herkes */}
          <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
            <Link to="/" onClick={onClose} className="pressable nav-hover-blue" style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: `0.6rem ${isCollapsed ? '0' : '0.75rem'}`,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              borderRadius: '8px', textDecoration: 'none',
              background: loc.pathname === '/' ? 'rgba(37,99,235,0.35)' : 'transparent',
              color: loc.pathname === '/' ? S_TEXT_ACTIVE : S_TEXT,
              fontWeight: loc.pathname === '/' ? 600 : 400,
              fontSize: '0.9rem', position: 'relative', overflow: 'hidden',
            }}>
              {loc.pathname === '/' && !isCollapsed && (
                <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />
              )}
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}><i className="bi bi-bar-chart-fill"></i></span>
              <span style={{ whiteSpace: 'nowrap', opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto', transition: 'opacity 200ms, width 200ms', overflow: 'hidden' }}>
                Canlı Rapor
              </span>
            </Link>
          </li>

          {/* Ciro Karşılaştırması */}
          {hasPermission('ciro_karsilastirma') && (
            <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
              <AdminLink to="/ciro-karsilastirma" icon={<i className="bi bi-graph-up-arrow"></i>} label="Ciro Karşılaştırması" isCollapsed={isCollapsed} onClose={onClose} hoverClass="nav-hover-emerald" />
            </li>
          )}

          {/* Divider */}
          {!isCollapsed && <li style={{ listStyle: 'none', margin: '0.35rem 0.5rem', borderTop: `1px solid ${S_BORDER}`, opacity: 0.6 }} />}

          {/* Filtreler — izinli kullanıcılar */}
          {hasPermission('filtreler') && (
            isCollapsed ? (
              <>
                <li style={{ listStyle: 'none', marginBottom: '0.1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem 0', color: S_TEXT, opacity: 0.4, fontSize: '1rem' }}>
                    <i className="bi bi-funnel-fill"></i>
                  </div>
                </li>
                {!hasRole('guest') && (
                  <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                    <Link to="/dashboard/ekle" onClick={onClose} className="pressable nav-hover-indigo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0', borderRadius: '7px', textDecoration: 'none', background: loc.pathname === '/dashboard/ekle' ? 'rgba(37,99,235,0.3)' : 'transparent', color: loc.pathname === '/dashboard/ekle' ? S_TEXT_ACTIVE : S_TEXT, fontSize: '1rem' }}>
                      <i className="bi bi-plus-circle"></i>
                    </Link>
                  </li>
                )}
                {rootPages.map(p => <PageTreeItem key={p.id} page={p} isCollapsed={true} onClose={onClose} />)}
                {[
                  { to: '/reports', icon: 'bi bi-clipboard-data' },
                  { to: '/gelistirme/donem-karsilastirma', icon: 'bi bi-calendar2-range' },
                  { to: '/gelistirme/ambar-akis', icon: 'bi bi-diagram-3' },
                  { to: '/gelistirme/fark-analizi', icon: 'bi bi-arrow-left-right' },
                ].map(({ to, icon }) => (
                  <li key={to} style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                    <Link to={to} onClick={onClose} className="pressable nav-hover-indigo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem 0', borderRadius: '7px', textDecoration: 'none', background: loc.pathname === to ? 'rgba(37,99,235,0.3)' : 'transparent', color: loc.pathname === to ? S_TEXT_ACTIVE : S_TEXT, fontSize: '1rem' }}>
                      <i className={icon}></i>
                    </Link>
                  </li>
                ))}
              </>
            ) : (
              <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
                <button onClick={toggleFilters} className="pressable nav-hover-indigo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: S_TEXT, fontSize: '0.9rem', textAlign: 'left' }}>
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}><i className="bi bi-funnel-fill"></i></span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Filtreler</span>
                  <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem', opacity: 0.5, transition: 'transform 200ms', transform: filtersOpen ? 'rotate(180deg)' : 'none' }}></i>
                </button>
                {filtersOpen && (
                  <ul style={{ listStyle: 'none', padding: '2px 0 4px 0.75rem', margin: '0 0 0 0.9rem', borderLeft: `1px solid ${S_BORDER}` }}>
                    {/* Widget Ekle — user + admin, en üstte */}
                    {!hasRole('guest') && (
                      <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                        <Link to="/dashboard/ekle" onClick={onClose} className="pressable nav-hover-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '7px', textDecoration: 'none', background: loc.pathname === '/dashboard/ekle' ? 'rgba(37,99,235,0.3)' : 'transparent', color: loc.pathname === '/dashboard/ekle' ? S_TEXT_ACTIVE : S_TEXT, fontWeight: loc.pathname === '/dashboard/ekle' ? 600 : 400, fontSize: '0.87rem', position: 'relative', overflow: 'hidden' }}>
                          {loc.pathname === '/dashboard/ekle' && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />}
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}><i className="bi bi-plus-circle"></i></span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Widget Ekle</span>
                        </Link>
                      </li>
                    )}
                    {/* Raporlar (dinamik sayfalar) */}
                    <PagesMenu pages={rootPages} isCollapsed={false} onClose={onClose} nested />
                    {/* Rapor Filtreleme */}
                    {[
                      { to: '/reports',                        icon: 'bi bi-clipboard-data',    label: 'Rapor Filtreleme',     hover: 'nav-hover-slate' },
                      { to: '/gelistirme/donem-karsilastirma', icon: 'bi bi-calendar2-range',   label: 'Dönem Karşılaştırması', hover: 'nav-hover-violet' },
                      { to: '/gelistirme/ambar-akis',          icon: 'bi bi-diagram-3',          label: 'Ambar Akış Haritası',  hover: 'nav-hover-cyan' },
                      { to: '/gelistirme/fark-analizi',        icon: 'bi bi-arrow-left-right',   label: 'Fark Analizi',         hover: 'nav-hover-rose' },
                    ].map(({ to, icon, label, hover }) => (
                      <li key={to} style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                        <Link to={to} onClick={onClose} className={`pressable ${hover}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '7px', textDecoration: 'none', background: loc.pathname === to ? 'rgba(37,99,235,0.3)' : 'transparent', color: loc.pathname === to ? S_TEXT_ACTIVE : S_TEXT, fontWeight: loc.pathname === to ? 600 : 400, fontSize: '0.87rem', position: 'relative', overflow: 'hidden' }}>
                          {loc.pathname === to && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />}
                          <span style={{ fontSize: '1rem', flexShrink: 0 }}><i className={icon}></i></span>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          )}

          {/* Divider */}
          {!isCollapsed && <li style={{ listStyle: 'none', margin: '0.35rem 0.5rem', borderTop: `1px solid ${S_BORDER}`, opacity: 0.6 }} />}

          {/* Cost — izinli kullanıcılar */}
          {hasPermission('cost') && (
            isCollapsed ? (
              <>
                <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem 0', color: S_TEXT, opacity: 0.4, fontSize: '1rem' }}>
                    <i className="bi bi-currency-dollar"></i>
                  </div>
                </li>
                <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                  <Link to="/cost/envanter" onClick={onClose} className="pressable nav-hover-green" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0.5rem 0', borderRadius: '7px', textDecoration: 'none',
                    background: loc.pathname.startsWith('/cost/') ? 'rgba(37,99,235,0.3)' : 'transparent',
                    color: loc.pathname.startsWith('/cost/') ? S_TEXT_ACTIVE : S_TEXT,
                    fontSize: '1rem',
                  }}>
                    <i className="bi bi-box-seam"></i>
                  </Link>
                </li>
              </>
            ) : (
              <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
                {/* Level 1: Cost */}
                <button
                  onClick={toggleCost}
                  className="pressable nav-hover-green"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: S_TEXT, fontSize: '0.9rem', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}><i className="bi bi-currency-dollar"></i></span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Cost</span>
                  <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem', opacity: 0.5, transition: 'transform 200ms', transform: costOpen ? 'rotate(180deg)' : 'none' }}></i>
                </button>
                {costOpen && (
                  <ul style={{ listStyle: 'none', padding: '2px 0 4px 0.75rem', margin: '0 0 0 0.9rem', borderLeft: `1px solid ${S_BORDER}` }}>
                    {/* Level 2: Envanterler */}
                    <li style={{ listStyle: 'none', marginBottom: '0.1rem' }}>
                      <button
                        onClick={toggleCostEnv}
                        className="pressable nav-hover-green"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          width: '100%', padding: '0.45rem 0.75rem', borderRadius: '7px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: S_TEXT, fontSize: '0.85rem', textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: '0.95rem', flexShrink: 0 }}><i className="bi bi-clipboard2-data"></i></span>
                        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Envanterler</span>
                        <i className="bi bi-chevron-down" style={{ fontSize: '0.7rem', opacity: 0.45, transition: 'transform 200ms', transform: costEnvOpen ? 'rotate(180deg)' : 'none' }}></i>
                      </button>
                      {costEnvOpen && (
                        <ul style={{ listStyle: 'none', padding: '2px 0 4px 0.75rem', margin: '0 0 0 0.9rem', borderLeft: `1px solid ${S_BORDER}` }}>
                          {[
                            { to: '/cost/envanter', icon: 'bi bi-box-seam',         label: 'Envanter Takip' },
                            { to: '/cost/urunler',  icon: 'bi bi-boxes',            label: 'Ürün Yönetimi' },
                            { to: '/cost/rapor',    icon: 'bi bi-funnel',           label: 'Envanter Rapor' },
                            { to: '/cost/fark',     icon: 'bi bi-arrow-left-right', label: 'Envanter Fark' },
                          ].map(({ to, icon, label }) => (
                            <li key={to} style={{ listStyle: 'none', marginBottom: '0.1rem' }}>
                              <Link
                                to={to}
                                onClick={onClose}
                                className="pressable nav-hover-green"
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  padding: '0.45rem 0.75rem', borderRadius: '7px', textDecoration: 'none',
                                  background: loc.pathname === to ? 'rgba(37,99,235,0.3)' : 'transparent',
                                  color: loc.pathname === to ? S_TEXT_ACTIVE : S_TEXT,
                                  fontWeight: loc.pathname === to ? 600 : 400,
                                  fontSize: '0.83rem', position: 'relative', overflow: 'hidden',
                                }}
                              >
                                {loc.pathname === to && (
                                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />
                                )}
                                <span style={{ fontSize: '0.9rem', flexShrink: 0 }}><i className={icon}></i></span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  </ul>
                )}
              </li>
            )
          )}

          {/* Divider */}
          {!isCollapsed && <li style={{ listStyle: 'none', margin: '0.35rem 0.5rem', borderTop: `1px solid ${S_BORDER}`, opacity: 0.6 }} />}

          {/* Geliştirme Sürecinde — izinli kullanıcılar */}
          {hasPermission('gelistirme') && (
            isCollapsed ? (
              <>
                <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem 0', color: S_TEXT, opacity: 0.4, fontSize: '0.9rem' }}>
                    <i className="bi bi-flask"></i>
                  </div>
                </li>
                {[
                  { to: '/siparisler', icon: 'bi bi-cart-fill' },
                  { to: '/siparisler/takip', icon: 'bi bi-clipboard-check' },
                  { to: '/alarmlar', icon: 'bi bi-bell-fill' },
                ].map(({ to, icon }) => (
                  <li key={to} style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                    <Link to={to} onClick={onClose} className="pressable nav-hover-amber" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0.5rem 0', borderRadius: '7px', textDecoration: 'none',
                      background: loc.pathname === to ? 'rgba(37,99,235,0.3)' : 'transparent',
                      color: loc.pathname === to ? S_TEXT_ACTIVE : S_TEXT,
                      fontSize: '1rem',
                    }}>
                      <i className={icon}></i>
                    </Link>
                  </li>
                ))}
              </>
            ) : (
              <li style={{ listStyle: 'none', marginBottom: '0.25rem' }}>
                <button
                  onClick={toggleDev}
                  className="pressable nav-hover-amber"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: S_TEXT, fontSize: '0.9rem', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}><i className="bi bi-flask"></i></span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Geliştirme Sürecinde</span>
                  <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem', opacity: 0.5, transition: 'transform 200ms', transform: devOpen ? 'rotate(180deg)' : 'none' }}></i>
                </button>
                {devOpen && (
                  <ul style={{ listStyle: 'none', padding: '2px 0 4px 0.75rem', margin: '0 0 0 0.9rem', borderLeft: `1px solid ${S_BORDER}` }}>
                    <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                      <Link
                        to="/siparisler"
                        onClick={onClose}
                        className="pressable nav-hover-amber"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', borderRadius: '7px', textDecoration: 'none',
                          background: loc.pathname === '/siparisler' ? 'rgba(37,99,235,0.3)' : 'transparent',
                          color: loc.pathname === '/siparisler' ? S_TEXT_ACTIVE : S_TEXT,
                          fontWeight: loc.pathname === '/siparisler' ? 600 : 400,
                          fontSize: '0.87rem', position: 'relative', overflow: 'hidden',
                        }}
                      >
                        {loc.pathname === '/siparisler' && (
                          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />
                        )}
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}><i className="bi bi-cart-fill"></i></span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Sipariş Listeleri</span>
                      </Link>
                    </li>
                    <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                      <Link
                        to="/siparisler/takip"
                        onClick={onClose}
                        className="pressable nav-hover-amber"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', borderRadius: '7px', textDecoration: 'none',
                          background: loc.pathname === '/siparisler/takip' ? 'rgba(37,99,235,0.3)' : 'transparent',
                          color: loc.pathname === '/siparisler/takip' ? S_TEXT_ACTIVE : S_TEXT,
                          fontWeight: loc.pathname === '/siparisler/takip' ? 600 : 400,
                          fontSize: '0.87rem', position: 'relative', overflow: 'hidden',
                        }}
                      >
                        {loc.pathname === '/siparisler/takip' && (
                          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />
                        )}
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}><i className="bi bi-clipboard-check"></i></span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Sipariş Takibi</span>
                      </Link>
                    </li>
                    <li style={{ listStyle: 'none', marginBottom: '0.15rem' }}>
                      <Link
                        to="/alarmlar"
                        onClick={onClose}
                        className="pressable nav-hover-amber"
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.5rem 0.75rem', borderRadius: '7px', textDecoration: 'none',
                          background: loc.pathname === '/alarmlar' ? 'rgba(37,99,235,0.3)' : 'transparent',
                          color: loc.pathname === '/alarmlar' ? S_TEXT_ACTIVE : S_TEXT,
                          fontWeight: loc.pathname === '/alarmlar' ? 600 : 400,
                          fontSize: '0.87rem', position: 'relative', overflow: 'hidden',
                        }}
                      >
                        {loc.pathname === '/alarmlar' && (
                          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', background: '#60a5fa', borderRadius: '0 4px 4px 0' }} />
                        )}
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}><i className="bi bi-bell-fill"></i></span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>Alarm Yönetimi</span>
                        {unreadCount > 0 && (
                          <span style={{
                            background: '#ef4444', color: '#fff', borderRadius: '10px',
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', flexShrink: 0,
                          }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                        )}
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )
          )}

        </ul>
      </nav>

      {/* Yönetim Paneli — sadece admin */}
      {hasRole('admin') && (
        <div style={{ padding: '0 0.75rem 0.75rem 0.75rem', flexShrink: 0 }}>
          <AdminLink to="/admin" icon={<i className="bi bi-gear-fill"></i>} label="Yönetim Paneli" isCollapsed={isCollapsed} onClose={onClose} hoverClass="nav-hover-red" />
        </div>
      )}

      {/* System Status */}
      {!isCollapsed && <SystemStatus />}

      {/* User Profile */}
      <div style={{
        padding: '0.75rem 1rem', borderTop: `1px solid ${S_BORDER}`, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        flexDirection: isCollapsed ? 'column' : 'row',
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '50%',
          background: 'linear-gradient(135deg,#2563eb,#06b6d4)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '1rem', flexShrink: 0,
        }}>
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>

        {!isCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sidebar-text-active)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.username}
            </div>
            <div style={{ fontSize: '0.72rem', color: S_TEXT, textTransform: 'capitalize' }}>
              {user?.role}
            </div>
          </div>
        )}

        <button onClick={toggleSupport} className="pressable" title="Destek"
          style={{ padding: '0.4rem', background: S_BTN_BG, border: 'none', borderRadius: '6px', color: S_TEXT_HOVER, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '1.1rem' }}
        >
          <i className="bi bi-headset"></i>
        </button>

        <button onClick={toggleDark} className="pressable" title={dark ? 'Açık mod' : 'Koyu mod'}
          style={{ padding: '0.4rem', background: S_BTN_BG, border: 'none', borderRadius: '6px', color: S_TEXT_HOVER, cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '1.1rem' }}
        >
          {dark ? <i className="bi bi-sun-fill"></i> : <i className="bi bi-moon-fill"></i>}
        </button>

        <button onClick={logout} className="pressable" title="Çıkış Yap"
          style={{ padding: '0.4rem', background: S_BTN_BG, border: 'none', borderRadius: '6px', color: S_TEXT_HOVER, cursor: 'pointer', display: 'flex', alignItems: 'center', width: isCollapsed ? '100%' : 'auto', justifyContent: 'center', fontSize: '1.1rem' }}
        >
          <i className="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </aside>
    </>
  )
}
