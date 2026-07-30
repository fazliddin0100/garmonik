/**
 * Production deploy oldidan muhit o'zgaruvchilarini tekshirish
 *   npm run deploy:preflight
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const required = ["DATABASE_URL", "JWT_SECRET"];
const recommended = ["NEXT_PUBLIC_APP_URL", "NODE_ENV"];

let failed = 0;

function check(label, ok, hint = "") {
  console.log(ok ? `[OK] ${label}` : `[FAIL] ${label}${hint ? ` — ${hint}` : ""}`);
  if (!ok) failed++;
}

for (const key of required) {
  check(key, Boolean(process.env[key]?.trim()));
}

for (const key of recommended) {
  const v = process.env[key]?.trim();
  check(key, Boolean(v), "production uchun tavsiya etiladi");
}

const jwt = process.env.JWT_SECRET?.trim() ?? "";
check("JWT_SECRET uzunligi >= 32", jwt.length >= 32, "qisqa kalit xavfsiz emas");

const db = process.env.DATABASE_URL?.trim() ?? "";
check("DATABASE_URL postgres", /^postgres(ql)?:\/\//i.test(db));

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "";
if (appUrl) {
  check(
    "NEXT_PUBLIC_APP_URL https",
    appUrl.startsWith("https://"),
    "productionda HTTPS bo'lishi kerak",
  );
}

const kassaUrl = process.env.KASSA_DATABASE_URL?.trim();
if (kassaUrl && kassaUrl !== db) {
  console.log(
    "[WARN] KASSA_DATABASE_URL DATABASE_URL dan farq qiladi — bitta baza tavsiya etiladi",
  );
}

if (failed > 0) {
  console.error(`\n${failed} ta muammo. .env ni to'ldiring (namuna: .env.example)`);
  process.exit(1);
}

console.log("\nPreflight OK — deploy davom etishi mumkin");
