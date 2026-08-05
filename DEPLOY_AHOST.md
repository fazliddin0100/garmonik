# Production deploy — bitta domen (klinika + kassa)

Maqsad: **https://gormonik-plus-klinik.uz** — bitta Next.js ilova.

---

## 0. Tez o'rnatish — Ubuntu VPS (PM2 + Nginx)

```bash
sudo apt update && sudo apt install -y git
git clone <repo-url> garmonik
cd garmonik
sudo bash install.sh
```

Skript avtomatik o'rnatadi: **Node.js 20**, **PostgreSQL**, **PM2**, **Nginx**, build, admin seed.

Domen default: `https://gormonik-plus-klinik.uz`

HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gormonik-plus-klinik.uz -d www.gormonik-plus-klinik.uz
```

Yangilash:

```bash
cd garmonik
bash scripts/deploy/server-update-pm2.sh
```

Foydali buyruqlar:

```bash
pm2 status
pm2 logs garmonik
pm2 restart garmonik
curl -I http://127.0.0.1:3000/auth/login
```

---

| Yo'l | Vazifa |
|------|--------|
| `/auth/login` | Klinika xodimlari |
| `/kabinet` | Qabul |
| `/doctor` | Shifokor |
| `/kassa/login` | Kassa |
| `/kassa-admin` | Kassa admin |

Eski kassa domeni **gormonik-plus-clinik-kassa.uz** → `/kassa` ga redirect.

---

## 1. PostgreSQL (bitta baza)

ahost panel → **PostgreSQL** → baza `garmonik` (yoki mavjud).

Ulanish:

```
postgresql://USER:PASSWORD@HOST:5432/garmonik?sslmode=require
```

Klinika (`public` schema) va kassa (`kassa` schema) **bir xil** `DATABASE_URL` da.

### Eski kassa bazasi (garmonik_kassa.dump / .sql)

**Maqsad:** yangi ilova + eski kassa ma'lumotlari birga ishlashi.

| Schema | Vazifa |
|--------|--------|
| `public.patients` (uuid) | Klinika bemorlari |
| `kassa.*` | Kassa (cheklar, kassirlar, xizmatlar) |

Eski dump `public.users`, `public.invoices` ishlatadi — **to'g'ridan-to'g'ri pg_restore ishlamaydi**.

Skript avtomatik qiladi:

1. Dump → vaqtinchalik baza (`public` schema)
2. Ma'lumot → `kassa.users`, `kassa.invoices`, ...
3. Noto'g'ri `public.users`, `public.invoices` ... o'chiriladi
4. `public.patients` (klinika, uuid) **saqlanadi**

Fayl joylari (avtomatik qidiriladi):

- `/root/garmonik/garmonik_kassa.dump`
- `/root/garmonik/garmonik_kassa.sql`
- `/root/garmonik_kassa.dump`

```bash
# Dump ni loyiha yoki home ga qo'ying
cp ~/garmonik_kassa.dump ~/garmonik/

# Import (public -> kassa)
npm run deploy:import-kassa

# Faqat public dagi noto'g'ri kassa jadvallarini tozalash
npm run deploy:cleanup-public-kassa
```

`.env` (ixtiyoriy):

```env
KASSA_AUTO_IMPORT=true
KASSA_IMPORT_SQL=/root/garmonik_kassa.dump
```

Serverdan dump olish:

```bash
pg_dump -U garmonik_user -d garmonik_kassa -F p -f garmonik_kassa.sql
```

Loyihaga `garmonik_kassa.sql` ni qo'ying yoki `.env` da:

```env
KASSA_SOURCE_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/garmonik_kassa?sslmode=require"
```

---

## 2. Loyihani serverga yuklash

```bash
cd /home/sizning-user
git clone <repo-url> garmonik
cd garmonik
git checkout merge/kassa-into-garmonik
cp .env.example .env
nano .env
```

### `.env` (production)

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/garmonik?sslmode=require"
JWT_SECRET="kamida-32-belgili-yangi-tasodifiy-kalit"

NEXT_PUBLIC_APP_URL="https://gormonik-plus-klinik.uz"
KASSA_LEGACY_HOST="gormonik-plus-clinik-kassa.uz"

NEXT_PUBLIC_CLINIC_NAME="Gormonik Plus Klinik"
NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL=http://127.0.0.1:17888
RECEIPT_PRINTER_ENABLED=true

NODE_ENV=production
```

**Muhim:** `JWT_SECRET` va parollarni productionda yangilang.

---

## 3. O'rnatish (PM2 — tavsiya)

```bash
npm install
cp .env.example .env
nano .env   # DATABASE_URL, JWT_SECRET, SEED_ADMIN_LOGIN/PASSWORD

# Bir martalik to'liq o'rnatish (migratsiya + kassa import + admin):
npm run deploy:install
# yoki: npm run deploy:setup-db

npm run build

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**Admin avtomatik yaratiladi:** `deploy:install` bazada admin yo'q bo'lsa `npm run deploy:bootstrap` orqali login/parol yaratadi. Terminalda ko'rsatiladi.

Standart (`.env` da o'zgartirmasangiz):

| Login | Parol |
|-------|-------|
| `admin` | `admin123` |

Kirish: `/auth/login` → `/dashboard`

Ilova `3000` portda ishlaydi.

---

## 4. Nginx + HTTPS

Asosiy domen namunasi: `deploy/nginx/gormonik-plus-klinik.uz.conf.example`

```bash
sudo cp deploy/nginx/gormonik-plus-klinik.uz.conf.example /etc/nginx/sites-available/gormonik
sudo ln -sf /etc/nginx/sites-available/gormonik /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d gormonik-plus-klinik.uz -d www.gormonik-plus-klinik.uz
```

Eski kassa domeni redirect: `deploy/nginx/kassa-legacy-redirect.conf.example`

---

## 5. Print-agent (kassa chek printer)

Kassa kompyuterida (server emas, kassir PC):

```bash
cd print-agent
npm install
node agent.js
# yoki print-agent/start.bat (Windows)
```

`NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL` kassir brauzeri uchun `http://127.0.0.1:17888` bo'lishi kerak.

---

## Tekshirish

| Tizim | Login | Parol (seed) |
|-------|-------|--------------|
| Klinika | `admin` | `admin123` |
| Kabinet | `kabinet` | `kabinet123` |
| Kassa admin | `admin@klinika` | `admin123` |
| Kassir | `kassir1` | `kassir123` |

Brauzerda:

1. https://gormonik-plus-klinik.uz/kabinet
2. https://gormonik-plus-klinik.uz/kassa/login
3. https://gormonik-plus-clinik-kassa.uz → `/kassa` ga redirect

Local tekshiruv: `npm run merge:verify-phase-8`

---

## Yangilash (deploy)

```bash
bash scripts/deploy/server-update-pm2.sh
```

---

## Muammolar

| Belgisi | Yechim |
|---------|--------|
| Kassa 401 | `/kassa/login` dan qayta kiring |
| DB ulanmaydi | `DATABASE_URL`, `DATABASE_SSL=false` (localhost) |
| `permission denied to create role` | `sudo -u postgres psql -d garmonik -f scripts/deploy/postgres-stub-roles.sql` keyin `npm run deploy:install` |
| Build xato | `npm run db:kassa:generate` keyin `npm run build` |
| Eski kassa domeni | nginx redirect yoki `KASSA_LEGACY_HOST` |
