# Garmonik + Kassa birlashtirish

Maqsad: bitta Next.js ilova (`garmonik`), bitta PostgreSQL, localhost → `gormonik-plus-klinik.uz`.

**Asosiy branch:** `merge/kassa-into-garmonik`  
**Eski kassa loyihasi:** `../garmonik-kassa` (o‘chirilmaydi, nusxa sifatida qoladi)

---

## Bosqich 0 — Tayyorgarlik

- [x] Git branch: `merge/kassa-into-garmonik`
- [x] DB backup (`scripts/merge/backup-databases.ps1`)
- [x] Baseline yozildi (`scripts/merge/baseline-2026-06-21.md`)
- [x] `garmonik-kassa` saqlanadi (o‘chirilmaydi)

**Tekshiruv:** `powershell -File scripts/merge/verify-phase-0.ps1`

---

## Bosqich 1 — Fayllarni ko‘chirish

- [x] Prisma `garmonik` ga qo‘shildi (`prisma/kassa/`)
- [x] Kassa route/lib ko‘chirildi
- [x] Import yo‘llari yangilandi
- [x] Build kompilatsiyasi (kassa moduli); to'liq `npm run build` uchun eski klinika TS xatolari alohida tuzatiladi

**Tekshiruv:** `npm run merge:verify-phase-1`  
**Ishga tushirish:** `npm run dev` → http://localhost:3000/kassa/login

---

## Bosqich 2 — Bitta baza

- [x] Kassa jadvallari `garmonik` DB da (`kassa` schema)
- [x] Ma’lumot import (`garmonik_kassa` → `garmonik.kassa`)
- [x] Bemor bog‘lanishi (`kassa.patients.garmonik_patient_id`)

**Buyruq:** `npm run merge:phase-2`  
**Tekshiruv:** `npm run merge:verify-phase-2`  
**Eslatma:** `KASSA_DATABASE_URL` endi `DATABASE_URL` bilan bir xil (`garmonik` DB)

---

## Bosqich 3 — Auth birlashtirish

- [x] `VerifiedSession` ga `kassa` kind qo‘shildi
- [x] Kassa login `garmonik_session` cookie ham beradi
- [x] `proxy.ts` — `/kassa`, `/kassa-admin`, `/api/kassa` himoyasi
- [x] Eski `kassa_session` olib tashlash (Bosqich 7)

**Tekshiruv:** `npm run merge:verify-phase-3`  
**Sinov:** chiqib `/kassa/login` dan qayta kiring

---

## Bosqich 4 — Kassa UI ishga tushirish

- [x] To'lov formasi, cheklar, hisobot, xarajatlar view'lari
- [x] API `/api/kassa/*` (21 route)
- [x] `kassa.css` — alohida UI scope (TW4 + custom uslublar)
- [x] Print-agent ko'chirilgan (`print-agent/`)
- [x] Login sahifasi: sessiya bo'lsa avtomatik yo'naltirish
- [x] `/api/auth/me` kassa sessiyasini taniydi
- [x] SessionAlivePoller kassa yo'llarini buzmaydi

**Tekshiruv:** `npm run merge:verify-phase-4` (dev server kerak)  
**Smoke test:** `npm run merge:smoke-kassa`  
**Sinov:** to'lov → chek → hisobot (bemor qo'lda kiritiladi — Bosqich 5)

---

## Bosqich 5 — Bemor bog'lanish

- [x] Kabinetda karta ochilganda `kassa.patients` ham yaratiladi
- [x] `GET /api/kassa/patients/search?q=KB-...` (telefon, ism ham)
- [x] Kassa to'lov formasi: bemor qidiruv
- [x] Kassa to'lov navbati (kabinet navbatidan, qidiruvsiz)
- [x] To'lovdan keyin shifokor navbatida ko'rinadi
- [x] Invoice mavjud kassa/klinika bemoriga bog'lanadi
- [ ] Xizmatlar katalogi birlashtirish (keyingi qadam / Bosqich 5b)

**Mavjud bemorlarni bog'lash:** `npm run merge:phase-5-sync-patients`  
**Tekshiruv:** `npm run merge:verify-phase-5`

---

## Bosqich 7 — Legacy auth arxiv

- [x] `kassa_session` cookie olib tashlandi — faqat `garmonik_session`
- [x] `lib/kassa/auth.ts` va `lib/auth/kassa-proxy.ts` soddalashtirildi
- [x] `garmonik-kassa/` arxivlandi (`ARCHIVED.md`)

**Tekshiruv:** `npm run merge:verify-phase-7`  
**Smoke:** `node scripts/merge/smoke-kassa-phase-7.mjs` (dev server kerak)  
**Eslatma:** Eski brauzerda `kassa_session` qolsa, `/kassa/login` dan qayta kiring.

---

## Bosqich 8 — Production deploy (bitta domen)

- [x] `https://gormonik-plus-klinik.uz` — klinika + kassa bir ilovada
- [x] `DEPLOY_AHOST.md` — PM2 va Docker yo‘riqnomasi
- [x] Nginx namunalari (`deploy/nginx/`)
- [x] Eski kassa domeni redirect (`KASSA_LEGACY_HOST` + nginx)
- [x] `next.config.ts` — `standalone` (Docker)
- [x] `npm run deploy:preflight` — muhit tekshiruvi

**Tekshiruv:** `npm run merge:verify-phase-8`  
**Deploy:** serverda `DEPLOY_AHOST.md` bo‘yicha

| URL | Vazifa |
|-----|--------|
| `/kabinet` | Qabul |
| `/doctor/navbat` | Shifokor navbati |
| `/kassa` | Kassa |
| `gormonik-plus-clinik-kassa.uz` | → `/kassa` redirect |

---

## Bosqich 6

Klinik jarayon (navbat holatlari, to‘lov gate) — alohida reja.
