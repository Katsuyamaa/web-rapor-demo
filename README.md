# Web Rapor Demo — Örnek Gıda A.Ş.

Gerçek bir iç ERP raporlama sisteminden esinlenerek hazırlanmış, tamamen kurgusal veriler kullanan portfolyo demosu. Veritabanı ve gerçek kimlik doğrulama olmadan, Vercel serverless fonksiyonları üzerinden sabit/üretilmiş verilerle çalışır.

## Teknolojiler

- Frontend: React 19, Vite, React Router, Zustand, ApexCharts, GridStack
- API: Node.js serverless fonksiyonlar (veritabanı yok, bellek içi üretilen veri)
- Vercel (deploy)

## Kurulum ve Çalıştırma

İki terminalde ayrı ayrı:
```
# terminal 1 — API
npm run dev:api

# terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Ortam değişkeni veya veritabanı gerekmez. Demo giriş bilgisi: `demo` / `demo` (`admin` / `1234` de çalışır).

## Öne Çıkan Özellikler

- Sürükle-bırak widget dashboard (GridStack + ApexCharts)
- Depo transferi, sipariş ve maliyet raporlama ekranları
- Tamamen kurgusal, tutarlı (seed'li) örnek veri üretimi
- Sunucusuz (serverless) mimari — kalıcı veri yok, her istekte taze örnek veri
- Gerçek sistemden tamamen arındırılmış marka/şirket bilgisi
