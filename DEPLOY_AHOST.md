# Production deploy — bitta domen (klinika + kassa)

Maqsad: **https://gormonik-plus-klinik.uz** — bitta Next.js ilova.

---

## 0. Tez o'rnatish — Ubuntu VPS (Docker, PostgreSQL ichida)

**Domen:** `https://gormonik-plus-klinik.uz` (default sozlangan)

**Hostda PostgreSQL, Node.js yoki npm o'rnatish shart emas.** Docker ham skript o'rnatadi.

```bash
# Serverga SSH
sudo apt update && sudo apt install -y git

git clone <repo-url> garmonik
cd garmonik

# Bir buyruq: Docker + PostgreSQL + ilova + Nginx
sudo bash install.sh
```

Faqat domenni qayta sozlash (Docker allaqachon o'rnatilgan bo'lsa):

```bash
cd garmonik
git pull
sudo bash scripts/deploy/setup-domain.sh
```

HTTPS (bir marta):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d gormonik-plus-klinik.uz -d www.gormonik-plus-klinik.uz
```

Skript avtomatik qiladi:

| Qadam | Nima bo'ladi |
|-------|----------------|
| Docker | `get.docker.com` orqali o'rnatiladi |
| PostgreSQL | `docker-compose.yml` ichidagi `db` konteyner |
| `.env` | `.env.docker.example` dan, tasodifiy parollar bilan |
| Migratsiya + admin | `docker-entrypoint.sh` birinchi ishga tushishda |
| Ilova | `http://127.0.0.1:3000` |

Keyingi yangilash:

```bash
cd garmonik
bash scripts/deploy/server-update.sh
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

### Eski kassa bazasi (garmonik_kassa)

Serverda alohida `garmonik_kassa` bazasi bo'lsa (eski kassa ilovasi), yangi sayt **avtomatik** undan ma'lumot oladi:

1. `DATABASE_URL` → `garmonik` (yangi yagona baza)
2. `deploy:setup-db` bir xil hostdagi `garmonik_kassa` ni topib, `kassa` schema ga ko'chiradi
3. Yoki loyiha ildizidagi `garmonik_kassa.sql` dump faylidan import qiladi

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
pm2 start npm --name garmonik -- start
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

## 5. Docker (har qanday hosting)

To'liq stack — PostgreSQL + ilova (tavsiya etiladi):

```bash
cp .env.docker.example .env
nano .env   # POSTGRES_PASSWORD, JWT_SECRET, NEXT_PUBLIC_APP_URL
docker compose up -d --build
```

Tashqi PostgreSQL (managed DB / hosting paneli):

```bash
cp .env.docker.example .env
nano .env   # DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL
docker compose -f docker-compose.external-db.yml up -d --build
```

Birinchi marta Docker ishga tushganda admin **avtomatik** yaratiladi (entrypoint `bootstrap-if-empty` chaqiradi). Terminal logida login/parol chiqadi.

To'liq seedni qayta ishga tushirish kerak bo'lsa (bir marta): `.env` ga `RUN_DB_SEED=true` qo'shing.

**Production domen:** `.env` da `NEXT_PUBLIC_APP_URL=https://gormonik-plus-klinik.uz` qiling, keyin `docker compose up -d --build` (build vaqtida ham shu URL ishlatiladi).

---

## 6. Print-agent (kassa chek printer)

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
git pull
npm install
npm run db:migrate
npx prisma db push --schema=prisma/kassa/schema.prisma
npm run build
pm2 restart garmonik
```

---

## Muammolar

| Belgisi | Yechim |
|---------|--------|
| Kassa 401 | `/kassa/login` dan qayta kiring |
| DB ulanmaydi | `DATABASE_URL`, `sslmode=require` |
| Build xato | `npm run db:kassa:generate` keyin `npm run build` |
| Eski kassa domeni | nginx redirect yoki `KASSA_LEGACY_HOST` |
