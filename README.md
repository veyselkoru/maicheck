# mAicheck v3.1 — Workforce Compliance Operating System

**Alt İşveren Denetim ve Uyum Yönetim Portalı**  
Geliştiren: mAiTechs Smart Solutions | maitechs.com

---

## 🚀 Hızlı Kurulum (Docker)

```bash
# 1. Projeyi klonlayın
cd maicheck-v31

# 2. Tüm servisleri ayağa kaldırın
docker-compose up -d --build

# 3. İlk kurulumda seed verilerini yükleyin (otomatik çalışır)
# Logları izleyin:
docker-compose logs -f backend

# 4. Tarayıcınızda açın
open http://localhost
```

---

## 📋 Demo Hesaplar

| E-posta | Şifre | Rol |
|---------|-------|-----|
| admin@maicheck.com | maicheck123 | Admin |
| denetci@maicheck.com | maicheck123 | Denetçi |
| yonetici@maicheck.com | maicheck123 | Yönetici |

---

## 🏗️ Mimari

```
maicheck-v31/
├── backend/          # Node.js + Express + TypeScript + Prisma
│   ├── src/
│   │   ├── modules/  # Auth, Audits, Templates, Reports, vb.
│   │   └── common/   # Guard, filter, helpers
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── Dockerfile
├── frontend/         # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/    # 16 sayfa
│   │   ├── lib/      # API, store, helpers
│   │   └── components/
│   ├── nginx.conf
│   └── Dockerfile
└── docker-compose.yml
```

---

## 🛠️ Geliştirme Ortamı (Docker olmadan)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# .env dosyasındaki DATABASE_URL'i güncelleyin

npx prisma db push
npx ts-node prisma/seed.ts
npm run dev
# → http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## 📦 Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Node.js 20, Express, TypeScript, Prisma ORM |
| Veritabanı | PostgreSQL 15 |
| Frontend | React 18, Vite, Tailwind CSS v3, Zustand, TanStack Query |
| Rapor | DOCX (docx npm), HTML önizleme |
| Upload | Multer (local → S3 hazır) |
| Auth | JWT (Bearer token) |
| Container | Docker, docker-compose, Nginx |

---

## ✅ Özellikler

### Denetim Yönetimi
- Tek dönem / dönem aralığı denetim oluşturma
- 8 hazır şablon (130–45 madde arası)
- Alan bazlı risk trafik ışığı (Yeşil/Sarı/Kırmızı)
- Denetim kilitleme ve revizyona açma
- Detaylı checklist: uyum durumu, risk skoru, bulgular, aksiyonlar

### Raporlama
- Detaylı Denetim Raporu (HTML önizleme + DOCX export)
- Yönetici Özeti Raporu (HTML önizleme + DOCX export)
- Rapor geçmişi ve versiyonlama
- Kullanıcı notları (sistem alanları kilitli)
- Kurumsal markalama (logo solda, mAiTechs ortada, alt işveren sağda)

### Şablon Editörü
- Madde ekleme / düzenleme / pasife alma
- Alan filtreleri, sıralama
- Klonlama ve yeni şablon oluşturma

### Bulgular & Aksiyonlar
- Tam CRUD bulgular sayfası
- Filtreler: alt işveren, uyum, önem, durum, alan, belge varlığı
- Bulgudan checklist satırına direkt geçiş
- Aksiyon takibi ve kapanış notu

### Evrak Arşivi
- Drag-drop çoklu yükleme
- Progress bar
- Dosya versiyonlama
- Arşiv arama (alt işveren, belge türü, alan, dosya adı)
- İndirme ve checklist bağlantısı

### Finansal Etki Motoru
- Parametre tablosu (SGK, Vergi, İŞKUR, İş Hukuku, İSG)
- Sabit / kişi başı / gün başı / belge başı / oran bazlı hesaplama
- Tahmini etki (kesin ceza gibi gösterilmez)
- Geçerlilik tarihi takibi

### İletişim Merkezi
- Alt işveren kontak yönetimi
- 5 mail şablonu: eksik belge, aksiyon, süre aşımı, rapor, kapanış
- mailto entegrasyonu (Outlook/Gmail'de açar)
- Taslak düzenleme ve kopyalama

### Dashboard
- Alt işveren performans skorları
- Trend göstergeleri (son 3 dönem renk noktaları)
- Alan bazlı risk tablosu (tıklanabilir → Bulgular)
- Tüm KPI kartları tıklanabilir → ilgili sayfa + filtre

---

## 🔒 Güvenlik & Uyum

- Tenant izolasyonu: tüm sorgularda `companyId` kontrolü
- JWT Bearer token kimlik doğrulama
- Denetim kilitleme: hukuki kayıt değiştirilemezliği
- Revizyon sistemi: eski versiyon korunur
- Tüm kritik işlemler `AuditLog` tablosuna kaydedilir

---

## ⚙️ Environment Variables

```env
DATABASE_URL=postgresql://maicheck:maicheck123@postgres:5432/maicheck_db
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3001
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100
```

---

## 🗂️ API Endpoints (Özet)

| Endpoint | Açıklama |
|----------|---------|
| POST /api/auth/login | Giriş |
| GET /api/dashboard | Dashboard özeti |
| GET/POST /api/audits | Denetim listesi/oluşturma |
| GET /api/audits/:id | Denetim detayı |
| POST /api/audits/:id/lock | Denetim kilitleme |
| GET/PATCH /api/audit-items/:id | Checklist güncelleme |
| GET/POST /api/findings | Bulgular |
| POST /api/evidence/upload | Belge yükleme |
| GET /api/evidence/archive | Evrak arşivi |
| POST /api/reports/generate | Rapor oluşturma |
| GET /api/reports/:id/html | HTML önizleme |
| GET /api/reports/:id/docx | DOCX indirme |
| GET/POST /api/impact | Finansal etki parametreleri |
| POST /api/impact/calculate | Tahmini hesaplama |
| GET/POST /api/communication/contacts | Kontaklar |
| POST /api/communication/generate-draft | Mail taslağı |
| GET /api/templates/:id/items | Şablon maddeleri |
| POST /api/templates/:id/items | Madde ekleme |

---

## 📊 Seed Verileri

- **Şirket:** ABC Perakende A.Ş.
- **Alt İşverenler:** X Temizlik, Y Güvenlik, Z Lojistik
- **Demo Denetimler:** Ocak 2026 (X Temizlik), Q1 2026 Aralık (Y Güvenlik)
- **Şablonlar:** 8 adet (Standart 130+ madde, Bordro 45, SGK 40, Fesih 35, İSG 35, Yıllık İzin 25, İşe Giriş/Çıkış 35, Özel boş)
- **Belgeler:** 57 adet
- **Finansal Etki Parametreleri:** 14 adet

---

## ⚠️ Bilinen Sınırlamalar (Known Issues)

1. **PDF Export:** Puppeteer server-side PDF generation bu versiyonda mevcut değil. DOCX export tam çalışır. HTML önizleme tarayıcıdan yazdırılabilir (Ctrl+P → PDF'e kaydet).
2. **Parola Değişikliği:** Bu versiyonda UI üzerinden parola değiştirme ekranı yok.
3. **Çoklu Tenant:** Şu an tek tenant (tek şirket). Multi-tenant genişletmesi hazır altyapı üzerine yapılabilir.
4. **E-posta Gönderimi:** İletişim Merkezi'nde mailto çalışır; otomatik SMTP gönderimi bu versiyonda yoktur.
5. **OCR/Mail Entegrasyonu:** Evrak yüklemede OCR ve mail inbox entegrasyonu ilerleyen versiyonda eklenecek.

---

*mAicheck v3.1 — mAiTechs Smart Solutions — maitechs.com*
