/**
 * Klinika (garmonik) login holatini tekshirish — /auth/login uchun.
 *   node scripts/merge/check-clinic-login.mjs
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import bcrypt from "bcryptjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
process.chdir(root);
config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL topilmadi (.env.local)");
  process.exit(1);
}

const DEMO = [
  { login: "admin", password: "admin123", note: "admin (klinika direktori)" },
  { login: "kabinet", password: "kabinet123", note: "qabul kabineti" },
  { login: "doctor", password: "doctor123", note: "shifokor" },
  { login: "laborant", password: "lab123", note: "laboratoriya" },
  { login: "hamshira", password: "hamshira123", note: "hamshira" },
];

console.log("DB:", url.replace(/:[^:@/]+@/, ":****@"));
console.log("\n--- KASSA login bu yerda ISHLAMAYDI ---");
console.log("admin@klinika -> /kassa/login da kiriladi\n");

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows: profiles } = await client.query(`
    select p.staff_login, p.auth_email, p.display_name, p.account_kind,
           p.staff_role, p.is_active, u.password_hash
    from portal_user_profiles p
    join app_users u on u.id = p.user_id
    order by p.account_kind, p.staff_login nulls last
  `);

  if (profiles.length === 0) {
    console.log("Foydalanuvchilar yo'q. Seed ishga tushiring:");
    console.log("  npm run db:migrate");
    console.log("  npm run db:seed");
    process.exit(1);
  }

  console.log("Ro'yxatdagi foydalanuvchilar:");
  for (const p of profiles) {
    const login = p.staff_login || p.auth_email;
    console.log(
      `  - ${login} (${p.account_kind}${p.staff_role ? "/" + p.staff_role : ""}) active=${p.is_active} — ${p.display_name}`,
    );
  }

  console.log("\nDemo parol tekshiruvi:");
  for (const d of DEMO) {
    const row = profiles.find(
      (p) =>
        (p.staff_login && p.staff_login.toLowerCase() === d.login) ||
        p.auth_email.toLowerCase() === d.login ||
        p.auth_email.toLowerCase().startsWith(d.login + "@"),
    );
    if (!row) {
      console.log(`  [??] ${d.login} — topilmadi`);
      continue;
    }
    const ok = await bcrypt.compare(d.password, row.password_hash);
    console.log(`  [${ok ? "OK" : "XX"}] ${d.login} / ${d.password} — ${d.note}`);
  }
} finally {
  await client.end();
}
