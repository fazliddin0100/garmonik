/**
 * Deploy oldidan muhit o'zgaruvchilarini tekshirish
 *   npm run deploy:preflight
 *
 * Local (localhost): faqat majburiy kalitlar tekshiriladi.
 * Production: HTTPS va NODE_ENV=production tavsiya etiladi (ogohlantirish).
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const required = ["DATABASE_URL", "JWT_SECRET"];

let failed = 0;
let warnings = 0;

function ok(label) {
  console.log(`[OK] ${label}`);
}

function fail(label, hint = "") {
  console.log(`[FAIL] ${label}${hint ? ` — ${hint}` : ""}`);
  failed++;
}

function warn(label, hint = "") {
  console.log(`[WARN] ${label}${hint ? ` — ${hint}` : ""}`);
  warnings++;
}

for (const key of required) {
  if (process.env[key]?.trim()) ok(key);
  else fail(key);
}

const jwt = process.env.JWT_SECRET?.trim() ?? "";
if (jwt.length >= 32) ok("JWT_SECRET uzunligi >= 32");
else fail("JWT_SECRET uzunligi >= 32", "qisqa kalit xavfsiz emas");

const db = process.env.DATABASE_URL?.trim() ?? "";
if (/^postgres(ql)?:\/\//i.test(db)) ok("DATABASE_URL postgres");
else fail("DATABASE_URL postgres");

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
const nodeEnv = process.env.NODE_ENV?.trim() ?? "";
const isLocal =
  !appUrl ||
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(appUrl);
const isProduction = nodeEnv === "production";

if (!appUrl) {
  warn("NEXT_PUBLIC_APP_URL", "production uchun tavsiya etiladi");
} else if (isLocal) {
  ok(`NEXT_PUBLIC_APP_URL (local: ${appUrl})`);
} else if (appUrl.startsWith("https://")) {
  ok("NEXT_PUBLIC_APP_URL https");
} else if (isProduction) {
  warn("NEXT_PUBLIC_APP_URL https", "productionda HTTPS bo'lishi kerak");
} else {
  ok(`NEXT_PUBLIC_APP_URL (${appUrl})`);
}

if (!nodeEnv) {
  if (isLocal) warn("NODE_ENV", "local uchun ixtiyoriy; productionda production qiling");
  else warn("NODE_ENV", "production uchun tavsiya etiladi");
} else if (isProduction) {
  ok("NODE_ENV=production");
} else {
  ok(`NODE_ENV=${nodeEnv}`);
}

const kassaUrl = process.env.KASSA_DATABASE_URL?.trim();
if (kassaUrl && kassaUrl !== db) {
  warn("KASSA_DATABASE_URL DATABASE_URL dan farq qiladi — bitta baza tavsiya etiladi");
}

if (failed > 0) {
  console.error(`\n${failed} ta majburiy muammo. .env ni to'ldiring (namuna: .env.example)`);
  process.exit(1);
}

if (warnings > 0) {
  console.log(`\n${warnings} ta ogohlantirish (o'rnatish davom etadi)`);
}

console.log("\nPreflight OK — deploy davom etishi mumkin");
