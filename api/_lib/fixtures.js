'use strict';
/**
 * Deterministic in-memory fixture data generator for the Örnek Gıda A.Ş. demo backend.
 *
 * IMPORTANT: This module uses a FIXED seed so that every serverless function
 * (each a separate cold-start process on Vercel) independently regenerates the
 * exact same dataset. This is what makes cross-endpoint consistency possible
 * without a shared database (e.g. /summary totals match /transfers sums).
 *
 * Nothing here is persisted — mutation endpoints (POST/PUT/DELETE) validate
 * input and return plausible success responses, but changes do not survive
 * across separate function invocations (stateless, no DB). This is an
 * accepted, documented limitation of the portfolio demo.
 */

const branchData = require('./data/branches.json');

const COMPANY_NAME = 'Örnek Gıda A.Ş.';

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20260802;
const rng = mulberry32(SEED);
function rand() { return rng(); }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function round(v, d = 2) { const m = 10 ** d; return Math.round((v + Number.EPSILON) * m) / m; }

// ── Static reference data ────────────────────────────────────────────────────
const BRANCHES = branchData.branches;   // giris_ambari (destination stores)
const FACTORIES = branchData.factories; // cikis_ambari (source factories/warehouses)

const PRODUCTS = [
  { name: 'TAM YAĞLI SÜT 1L', unit: 'ADET', price: 28 },
  { name: 'YARIM YAĞLI SÜT 1L', unit: 'ADET', price: 26 },
  { name: 'BEYAZ PEYNİR 500G', unit: 'ADET', price: 95 },
  { name: 'KAŞAR PEYNİR 400G', unit: 'ADET', price: 110 },
  { name: 'YOĞURT 1KG', unit: 'ADET', price: 45 },
  { name: 'SÜZME YOĞURT 500G', unit: 'ADET', price: 55 },
  { name: 'AYRAN 250ML', unit: 'ADET', price: 12 },
  { name: 'TEREYAĞI 250G', unit: 'ADET', price: 130 },
  { name: 'KAYMAK 200G', unit: 'ADET', price: 140 },
  { name: 'DONDURMA VANİLYALI 1L', unit: 'ADET', price: 85 },
  { name: 'DONDURMA ÇİKOLATALI 1L', unit: 'ADET', price: 90 },
  { name: 'DONDURMA FISTIKLI 1L', unit: 'ADET', price: 105 },
  { name: 'CHEESECAKE FRAMBUAZLI', unit: 'ADET', price: 165 },
  { name: 'CHEESECAKE SAN SEBASTIAN', unit: 'ADET', price: 175 },
  { name: 'PASTA ÇİKOLATALI DİLİM', unit: 'ADET', price: 60 },
  { name: 'PASTA MEYVELİ DİLİM', unit: 'ADET', price: 65 },
  { name: 'BÖREK PEYNİRLİ', unit: 'KG', price: 150 },
  { name: 'BÖREK KIYMALI', unit: 'KG', price: 165 },
  { name: 'BÖREK ISPANAKLI', unit: 'KG', price: 140 },
  { name: 'EKMEK TAM BUĞDAY', unit: 'ADET', price: 18 },
  { name: 'EKMEK BEYAZ', unit: 'ADET', price: 14 },
  { name: 'SİMİT', unit: 'ADET', price: 10 },
  { name: 'POĞAÇA PEYNİRLİ', unit: 'ADET', price: 15 },
  { name: 'KIYMA DANA', unit: 'KG', price: 320 },
  { name: 'TAVUK GÖĞSÜ', unit: 'KG', price: 140 },
  { name: 'SUCUK', unit: 'KG', price: 280 },
  { name: 'ÇİKOLATA BONBON KUTU', unit: 'ADET', price: 190 },
  { name: 'SANDVİÇ KARIŞIK', unit: 'ADET', price: 55 },
  { name: 'SANDVİÇ TAVUKLU', unit: 'ADET', price: 60 },
  { name: 'BAKLAVA FISTIKLI 1KG', unit: 'ADET', price: 380 },
];

const UNITS = ['ADET', 'KG', 'LT'];

// ── Date range: several months of history through "today" ──────────────────
const RANGE_START = new Date('2026-01-01T00:00:00Z');
const RANGE_END = new Date('2026-08-02T00:00:00Z');

function eachDay(start, end) {
  const days = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}
const ALL_DAYS = eachDay(RANGE_START, RANGE_END);

// ── Transfers ────────────────────────────────────────────────────────────────
function buildTransfers() {
  const rows = [];
  let id = 1;
  let docCounter = 100000;
  for (const day of ALL_DAYS) {
    // A handful of documents per day, each moving several products from one
    // factory to one branch.
    const docsToday = randInt(15, 35);
    for (let d = 0; d < docsToday; d++) {
      const dokumanNo = `TR${docCounter++}`;
      const cikis = pick(FACTORIES);
      const giris = pick(BRANCHES);
      const lineCount = randInt(1, 6);
      for (let l = 0; l < lineCount; l++) {
        const prod = pick(PRODUCTS);
        const talep = round(randInt(5, 200) + rand(), 2);
        const sapmaOrani = rand() < 0.8 ? 0 : (rand() - 0.5) * 0.2; // %10 sapma bazen
        const miktar = round(Math.max(0, talep * (1 + sapmaOrani)), 2);
        const fiyat = round(prod.price * (0.9 + rand() * 0.2), 2);
        const toplam = round(miktar * fiyat, 2);
        rows.push({
          id: id++,
          dokuman_no: dokumanNo,
          dokuman_tarihi: day,
          cikis_ambari: cikis,
          giris_ambari: giris,
          stok_no: `STK${1000 + PRODUCTS.indexOf(prod)}`,
          stok_adi: prod.name,
          miktar,
          talep_edilen_miktar: talep,
          birim: prod.unit,
          miktar_tb: miktar,
          temel_birim: prod.unit,
          ort_fiyat_tb: fiyat,
          toplam,
          source_file: `demo_${day}.xls`,
        });
      }
    }
  }
  return rows;
}
const TRANSFERS = buildTransfers();

// ── Orders (siparişler) ───────────────────────────────────────────────────────
function buildOrders() {
  const rows = [];
  let id = 1;
  let orderCounter = 500000;
  for (const day of ALL_DAYS) {
    const ordersToday = randInt(8, 20);
    for (let o = 0; o < ordersToday; o++) {
      const branch = pick(BRANCHES);
      const warehouse = pick(FACTORIES);
      const orderNo = `SIP${orderCounter++}`;
      const lineCount = randInt(1, 5);
      const firstSeen = new Date(`${day}T${String(randInt(8, 19)).padStart(2, '0')}:${String(randInt(0, 59)).padStart(2, '0')}:00Z`);
      for (let l = 0; l < lineCount; l++) {
        const prod = pick(PRODUCTS);
        const miktar = round(randInt(5, 150) + rand(), 2);
        const toplam = round(miktar * prod.price, 2);
        rows.push({
          id: id++,
          order_no: orderNo,
          order_date: day,
          warehouse,
          branch,
          stok_no: `STK${1000 + PRODUCTS.indexOf(prod)}`,
          stok_adi: prod.name,
          miktar,
          birim: prod.unit,
          toplam,
          first_seen_at: firstSeen.toISOString().slice(0, 19).replace('T', ' '),
        });
      }
    }
  }
  return rows;
}
const ORDERS = buildOrders();

// ── Transfer orders (talep listeleri) ────────────────────────────────────────
function buildTransferOrders() {
  const rows = [];
  let id = 1;
  const recentDays = ALL_DAYS.slice(-30);
  for (const day of recentDays) {
    const n = randInt(10, 25);
    for (let i = 0; i < n; i++) {
      const prod = pick(PRODUCTS);
      rows.push({
        id: id++,
        order_date: day,
        giris_ambari: pick(BRANCHES),
        stok_adi: prod.name,
        miktar: round(randInt(5, 100) + rand(), 2),
        birim: prod.unit,
        source_file: `talep_${day}.xlsx`,
      });
    }
  }
  return rows;
}
const TRANSFER_ORDERS = buildTransferOrders();

// ── Users ─────────────────────────────────────────────────────────────────────
const USERS = [
  { id: 1, username: 'admin', password: '1234', role: 'admin', password_plain: '1234' },
  { id: 2, username: 'demo', password: 'demo', role: 'admin', password_plain: 'demo' },
  { id: 3, username: 'kullanici1', password: 'kullanici1234', role: 'user', password_plain: 'kullanici1234' },
  { id: 4, username: 'misafir', password: 'misafir1234', role: 'guest', password_plain: 'misafir1234' },
];
const USER_PERMISSIONS = { 1: ['ciro_karsilastirma', 'filtreler', 'cost', 'gelistirme'], 2: ['ciro_karsilastirma', 'filtreler', 'cost', 'gelistirme'], 3: ['filtreler'], 4: [] };

// ── Pages / Widgets ───────────────────────────────────────────────────────────
const PAGES = [
  { id: 1, title: 'Anasayfa', slug: 'anasayfa', path: '/1/', depth: 0, parent_id: null, page_type: 'root', icon: '📊', color: '#3b82f6', sort_order: 0, url: null, created_by: 1, created_at: '2026-01-05 09:00:00' },
  { id: 2, title: 'Satış Raporları', slug: 'satis-raporlari', path: '/2/', depth: 0, parent_id: null, page_type: 'container', icon: '🗂️', color: '#10b981', sort_order: 1, url: null, created_by: 1, created_at: '2026-01-05 09:05:00' },
  { id: 3, title: 'Şube Performansı', slug: 'sube-performansi', path: '/2/3/', depth: 1, parent_id: 2, page_type: 'page', icon: '🏬', color: '#f59e0b', sort_order: 0, url: null, created_by: 1, created_at: '2026-01-06 10:00:00' },
  { id: 4, title: 'Ürün Analizi', slug: 'urun-analizi', path: '/2/4/', depth: 1, parent_id: 2, page_type: 'page', icon: '📦', color: '#8b5cf6', sort_order: 1, url: null, created_by: 1, created_at: '2026-01-06 10:10:00' },
];

const WIDGETS = [
  { id: 1, page_id: 1, widget_type: 'system', title: 'Toplam Tutar', system_key: 'total_value', color: '#3b82f6', pos_x: 0, pos_y: 0, size_x: 2, size_y: 1, config: '{}', parent_widget_id: null, created_by: 1 },
  { id: 2, page_id: 1, widget_type: 'system', title: 'Toplam Miktar', system_key: 'total_qty', color: '#10b981', pos_x: 2, pos_y: 0, size_x: 2, size_y: 1, config: '{}', parent_widget_id: null, created_by: 1 },
  { id: 3, page_id: 1, widget_type: 'system', title: 'İşlem Adedi', system_key: 'total_docs', color: '#f59e0b', pos_x: 4, pos_y: 0, size_x: 2, size_y: 1, config: '{}', parent_widget_id: null, created_by: 1 },
  { id: 4, page_id: 1, widget_type: 'system', title: 'Kullanıcılar', system_key: 'active_users', color: '#8b5cf6', pos_x: 6, pos_y: 0, size_x: 2, size_y: 1, config: '{}', parent_widget_id: null, created_by: 1 },
  { id: 5, page_id: 3, widget_type: 'chart', title: 'Şubelere Göre Ciro (Aylık)', system_key: null, color: '#3b82f6', pos_x: 0, pos_y: 1, size_x: 6, size_y: 3,
    config: JSON.stringify({ chart_type: 'bar', metric: 'sum_toplam', group_by: 'giris_ambari', data_limit: 10, date_filter: 'last30days' }), parent_widget_id: null, created_by: 1 },
  { id: 6, page_id: 4, widget_type: 'chart', title: 'Ürün Bazlı Tutar', system_key: null, color: '#10b981', pos_x: 0, pos_y: 1, size_x: 6, size_y: 3,
    config: JSON.stringify({ chart_type: 'pie', metric: 'sum_toplam', group_by: 'stok_adi', data_limit: 8, date_filter: 'last30days' }), parent_widget_id: null, created_by: 1 },
];
let _widgetIdSeq = WIDGETS.length + 1;
let _pageIdSeq = PAGES.length + 1;

// ── Distribution templates / ruts ────────────────────────────────────────────
const DIST_TEMPLATES = [
  { id: 1, name: 'dolap', display_name: 'Dolap Listesi', format_type: 'grid' },
  { id: 2, name: 'dondurma', display_name: 'Dondurma Dolap Listesi', format_type: 'grid' },
  { id: 3, name: 'sandvic', display_name: 'Sandviç Dağıtım', format_type: 'vertical' },
  { id: 4, name: 'pasta', display_name: 'Pasta Dağıtım', format_type: 'vertical' },
];
const DIST_TEMPLATE_PRODUCTS = {
  1: PRODUCTS.slice(0, 8).map((p, i) => ({ id: i + 1, product_name: p.name, sort_order: i })),
  2: PRODUCTS.filter(p => p.name.startsWith('DONDURMA')).map((p, i) => ({ id: i + 1, product_name: p.name, sort_order: i })),
  3: PRODUCTS.filter(p => p.name.startsWith('SANDVİÇ')).map((p, i) => ({ id: i + 1, product_name: p.name, sort_order: i })),
  4: PRODUCTS.filter(p => p.name.startsWith('PASTA')).map((p, i) => ({ id: i + 1, product_name: p.name, sort_order: i })),
};
const DIST_RUTS = BRANCHES.slice(0, 20).map((b, i) => ({ id: i + 1, branch_name: b, rut_number: (i % 5) + 1 }));

// ── Alarms ────────────────────────────────────────────────────────────────────
const ALARM_RULES = [
  { id: 1, name: 'Düşük Ciro Uyarısı', metric: 'total_tutar', ambar: FACTORIES[0], giris_ambari: null, stok_adi: null, rule_type: 'threshold', threshold_value: 5000, comparison: 'lt', iqr_multiplier: 1.5, period: 'gun', is_active: 1, created_by: 1, created_at: '2026-02-01 10:00:00' },
  { id: 2, name: 'Anomali Tespiti - Miktar', metric: 'miktar', ambar: null, giris_ambari: null, stok_adi: PRODUCTS[0].name, rule_type: 'iqr', threshold_value: null, comparison: 'gt', iqr_multiplier: 1.5, period: 'hafta', is_active: 1, created_by: 1, created_at: '2026-02-10 10:00:00' },
];
const ALARM_LOGS = [
  { id: 1, rule_id: 1, triggered_at: '2026-07-15', actual_value: 3200.5, expected_value: 5000, message: `${FACTORIES[0]} için günlük ciro eşiğin altında kaldı.`, is_read: 0, created_at: '2026-07-15 08:05:00', rule_name: 'Düşük Ciro Uyarısı', comparison: 'lt', metric: 'total_tutar' },
  { id: 2, rule_id: 2, triggered_at: '2026-07-20', actual_value: 980, expected_value: 620, message: `${PRODUCTS[0].name} haftalık hareketinde olağan dışı artış.`, is_read: 1, created_at: '2026-07-20 08:05:00', rule_name: 'Anomali Tespiti - Miktar', comparison: 'gt', metric: 'miktar' },
];

// ── Roadmap ───────────────────────────────────────────────────────────────────
const ROADMAP_ITEMS = [
  { id: 1, title: 'Veri Sağlığı Paneli', description: 'Son senkronizasyon zamanı, günlük kayıt sayısı trendi, tarih boşluğu tespiti.', category: 'veri_sagligi', status: 'fikir', priority: 1, effort: 'orta', value_score: 'yuksek', notes: null, created_by: 1, created_at: '2026-01-10 09:00:00', updated_at: '2026-01-10 09:00:00' },
  { id: 2, title: 'Eşik & Sapma Alarmları', description: 'Kullanıcı tanımlı eşikler, IQR tabanlı anomali tespiti, in-app bildirim.', category: 'uyarilar', status: 'gelistirme', priority: 1, effort: 'orta', value_score: 'yuksek', notes: null, created_by: 1, created_at: '2026-01-12 09:00:00', updated_at: '2026-03-01 09:00:00' },
  { id: 3, title: 'Hedef vs Gerçekleşen', description: 'Aylık/yıllık hedef tanımı, gauge widget, yılbaşından bu yana karşılaştırma.', category: 'analitik', status: 'planli', priority: 2, effort: 'yuksek', value_score: 'yuksek', notes: null, created_by: 1, created_at: '2026-02-01 09:00:00', updated_at: '2026-02-01 09:00:00' },
  { id: 4, title: 'Pivot Tablo View', description: 'Ambar × stok × ay dinamik pivot.', category: 'analitik', status: 'fikir', priority: 2, effort: 'yuksek', value_score: 'yuksek', notes: null, created_by: 1, created_at: '2026-02-15 09:00:00', updated_at: '2026-02-15 09:00:00' },
  { id: 5, title: 'Otomatik PDF Raporu', description: 'Saved filter + cron → PDF oluştur, e-posta ile gönder.', category: 'workflow', status: 'tamamlandi', priority: 3, effort: 'orta', value_score: 'orta', notes: 'v1 canlıya alındı.', created_by: 1, created_at: '2026-03-01 09:00:00', updated_at: '2026-06-01 09:00:00' },
];
let _roadmapIdSeq = ROADMAP_ITEMS.length + 1;

// ── Support ───────────────────────────────────────────────────────────────────
const SUPPORT_TICKETS = [
  { id: 1, user_id: 3, type: 'hata', title: 'Excel indirme sırasında hata', description: 'Zaman kırılımı Excel indirirken sayfa donuyor.', status: 'inceleniyor', priority: 2, page_url: '/reports', user_agent: 'Mozilla/5.0', created_at: '2026-07-10 11:00:00', updated_at: '2026-07-11 09:00:00', username: 'kullanici1' },
  { id: 2, user_id: 3, type: 'istek', title: 'Yeni filtre alanı isteği', description: 'Ürün kategorisi bazlı filtre eklenebilir mi?', status: 'yeni', priority: 3, page_url: '/reports', user_agent: 'Mozilla/5.0', created_at: '2026-07-20 14:00:00', updated_at: '2026-07-20 14:00:00', username: 'kullanici1' },
];
const SUPPORT_COMMENTS = {
  1: [
    { id: 1, ticket_id: 1, user_id: 3, comment: 'Hata detayları: Chrome, 200MB üstü veri seçiminde oluşuyor.', is_admin: 0, created_at: '2026-07-10 11:05:00', username: 'kullanici1' },
    { id: 2, ticket_id: 1, user_id: 1, comment: 'İnceleniyor, geçici çözüm olarak tarih aralığını daraltabilirsiniz.', is_admin: 1, created_at: '2026-07-11 09:00:00', username: 'admin' },
  ],
  2: [],
};
let _ticketIdSeq = SUPPORT_TICKETS.length + 1;
let _commentIdSeq = 3;

// ── Saved filters ─────────────────────────────────────────────────────────────
const SAVED_FILTERS = [
  { id: 1, name: 'Son 30 Gün - Tüm Şubeler', cikis_ambari: '', giris_ambari: '', stok_adi: '', date_filter: 'last30days', start_date: null, end_date: null, filter_type: 'report' },
  { id: 2, name: 'Anasayfa - Bu Ay', cikis_ambari: '', giris_ambari: '', stok_adi: '', date_filter: 'thisMonth', start_date: null, end_date: null, filter_type: 'live_report' },
];
let _savedFilterIdSeq = SAVED_FILTERS.length + 1;

// ── Inventory (cost module) ───────────────────────────────────────────────────
const INVENTORY_PRODUCTS = PRODUCTS.slice(0, 10).map((p, i) => ({
  id: i + 1, name: p.name, unit: p.unit, ambar: FACTORIES[i % FACTORIES.length],
  is_active: 1, sort_order: i, divisor: 1,
}));
function buildInventoryEntries() {
  const rows = [];
  let id = 1;
  const days = ALL_DAYS.slice(-45);
  for (const p of INVENTORY_PRODUCTS) {
    let mevcut = randInt(20, 100);
    for (const day of days) {
      const uretim = randInt(50, 300);
      const sevkiyat = randInt(30, 200);
      const yemekhane = randInt(0, 20);
      const online = randInt(0, 15);
      const ikram = randInt(0, 5);
      const zayii = randInt(0, 8);
      const diger = randInt(0, 5);
      const kalan = round(mevcut + uretim - sevkiyat - yemekhane - online - ikram - zayii - diger, 3);
      rows.push({
        id: id++, entry_date: day, product_id: p.id, mevcut, uretim, sevkiyat, yemekhane, online, ikram, zayii, diger,
        extra1: 0, extra2: 0, extra3: 0, extra4: 0, extra5: 0,
        notes: null, fr3002_synced: 0,
      });
      mevcut = Math.max(0, kalan);
    }
  }
  return rows;
}
const INVENTORY_ENTRIES = buildInventoryEntries();
const INVENTORY_COLUMN_LABELS = {}; // ambar -> {col_key: {label, visible}}

// ── System logs / scheduler / uploads ────────────────────────────────────────
const SYSTEM_LOGS = [
  { id: 1, log_type: 'success', category: 'auth', message: 'Giriş başarılı: demo', details: 'IP: 203.0.113.4', user_id: 2, username: 'demo', ip_address: '203.0.113.4', created_at: '2026-08-01 09:12:00' },
  { id: 2, log_type: 'info', category: 'data', message: 'Günlük veri senkronizasyonu tamamlandı', details: '2450 satır güncellendi', user_id: null, username: null, ip_address: null, created_at: '2026-08-02 02:05:00' },
  { id: 3, log_type: 'warning', category: 'admin', message: 'Kullanıcı izinleri güncellendi', details: 'perms=[cost]', user_id: 1, username: 'admin', ip_address: '203.0.113.10', created_at: '2026-07-28 16:40:00' },
];
const SCHEDULER_CONFIG = { enabled: false, hour: 2, minute: 0, interval_minutes: 0, last_run: '2026-08-02 02:00:00', last_status: 'OK - 2450 satır' };
const ORDERS_SCHEDULER_CONFIG = { enabled: false, interval_minutes: 5, cutoff_hour: 17, cutoff_minute: 0, last_run: '2026-08-02 17:05:00', last_status: 'OK' };
const UPLOAD_HISTORY = [
  { id: 1, filename: 'demo_2026-08-01.xls', assigned_date: '2026-08-01', upload_date: '2026-08-02 02:00:00', status: 'Basarili', row_count: 452 },
];

// ── Filtering helpers (mirrors core/db_helpers.build_filter_conditions) ─────
function splitCsv(v) { return (v || '').split(',').map(s => s.trim()).filter(Boolean); }

function filterTransfers(query = {}) {
  const { cikis, giris, stok, start, end } = query;
  const cikisVals = splitCsv(cikis);
  const girisVals = splitCsv(giris);
  const stokVals = splitCsv(stok);
  let effStart = start, effEnd = end;
  if (!cikis && !giris && !stok && !start && !end) {
    const today = RANGE_END;
    const weekAgo = new Date(today); weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
    effStart = weekAgo.toISOString().slice(0, 10);
    effEnd = today.toISOString().slice(0, 10);
  }
  return TRANSFERS.filter(r => {
    if (cikisVals.length && !cikisVals.includes(r.cikis_ambari)) return false;
    if (girisVals.length && !girisVals.includes(r.giris_ambari)) return false;
    if (stokVals.length && !stokVals.includes(r.stok_adi)) return false;
    if (effStart && r.dokuman_tarihi < effStart) return false;
    if (effEnd && r.dokuman_tarihi > effEnd) return false;
    return true;
  });
}

module.exports = {
  COMPANY_NAME, BRANCHES, FACTORIES, PRODUCTS, UNITS, ALL_DAYS, RANGE_START, RANGE_END,
  TRANSFERS, ORDERS, TRANSFER_ORDERS, USERS, USER_PERMISSIONS,
  PAGES, WIDGETS, DIST_TEMPLATES, DIST_TEMPLATE_PRODUCTS, DIST_RUTS,
  ALARM_RULES, ALARM_LOGS, ROADMAP_ITEMS, SUPPORT_TICKETS, SUPPORT_COMMENTS,
  SAVED_FILTERS, INVENTORY_PRODUCTS, INVENTORY_ENTRIES, INVENTORY_COLUMN_LABELS,
  SYSTEM_LOGS, SCHEDULER_CONFIG, ORDERS_SCHEDULER_CONFIG, UPLOAD_HISTORY,
  rand, randInt, pick, round, splitCsv, filterTransfers,
  nextWidgetId: () => _widgetIdSeq++,
  nextPageId: () => _pageIdSeq++,
  nextRoadmapId: () => _roadmapIdSeq++,
  nextTicketId: () => _ticketIdSeq++,
  nextCommentId: () => _commentIdSeq++,
  nextSavedFilterId: () => _savedFilterIdSeq++,
};
