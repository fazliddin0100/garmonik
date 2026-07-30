/**
 * Kassa DB va login holatini tekshirish.
 *   node scripts/merge/check-kassa-login.mjs
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

const url = process.env.DATABASE_URL || process.env.KASSA_DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL topilmadi (.env.local)");
  process.exit(1);
}

console.log("DB:", url.replace(/:[^:@/]+@/, ":****@"));

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows: users } = await client.query(
    `select login, full_name, role, is_active, failed_login_count, locked_until, password_hash
     from kassa.users order by login`,
  );

  if (users.length === 0) {
    console.log("\nFoydalanuvchilar yo'q. Seed ishga tushiring:");
    console.log("  npm run db:kassa:seed");
    process.exit(1);
  }

  console.log("\nFoydalanuvchilar:");
  for (const u of users) {
    const lock =
      u.locked_until && new Date(u.locked_until) > new Date()
        ? ` BLOKLANGAN (${u.locked_until})`
        : "";
    console.log(
      `  - ${u.login} (${u.role}) active=${u.is_active} failed=${u.failed_login_count}${lock}`,
    );
  }

  const admin = users.find((u) => u.login === "admin@klinika");
  if (admin) {
    const ok = await bcrypt.compare("admin123", admin.password_hash);
    console.log(`\nadmin@klinika + admin123: ${ok ? "TO'G'RI" : "NOTO'G'RI (seed qayta kerak)"}`);
  } else {
    console.log("\nadmin@klinika topilmadi — seed kerak");
  }

  const cashier = users.find((u) => u.login === "kassir1");
  if (cashier) {
    const ok = await bcrypt.compare("kassir123", cashier.password_hash);
    console.log(`kassir1 + kassir123: ${ok ? "TO'G'RI" : "NOTO'G'RI"}`);
  }
} finally {
  await client.end();
}
