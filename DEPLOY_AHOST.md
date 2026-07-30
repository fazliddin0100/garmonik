# Production deploy — bitta domen (klinika + kassa)

Maqsad: **https://gormonik-plus-klinik.uz** — bitta Next.js ilova.

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
npm run deploy:preflight
npm run db:migrate
npx prisma db push --schema=prisma/kassa/schema.prisma
npm run build

# Birinchi marta (ixtiyoriy seed):
# npm run db:seed
# npm run db:kassa:seed

npm install -g pm2
pm2 start npm --name garmonik -- start
pm2 save
pm2 startup
```

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

## 5. Docker (ixtiyoriy)

Panel PostgreSQL + faqat ilova konteyneri:

```bash
cp .env.example .env
# DATABASE_URL ni to'ldiring
docker compose -f docker-compose.ahost.yml up -d --build
```

Birinchi marta seed uchun `.env` ga `RUN_DB_SEED=true` qo'shing (faqat bir marta).

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
