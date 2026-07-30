/**
 * Bosqich 2: garmonik_kassa -> garmonik (kassa schema)
 *   node scripts/merge/phase-2-unify-database.mjs
 *   node scripts/merge/phase-2-unify-database.mjs --force  (qayta import)
 */
import { config } from "dotenv";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
process.chdir(root);

config({ path: ".env.local" });
config({ path: ".env" });

const force = process.argv.includes("--force");
const targetUrl = process.env.DATABASE_URL?.trim();
if (!targetUrl) {
  console.error("DATABASE_URL topilmadi");
  process.exit(1);
}

function readDbUrlFromEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"#]+)"?/);
    if (m) return m[1].trim().replace(/\?schema=public$/, "");
  }
  return null;
}

const sourceUrl =
  process.env.KASSA_SOURCE_DATABASE_URL?.trim() ||
  readDbUrlFromEnvFile(path.join(root, "..", "garmonik-kassa", ".env")) ||
  targetUrl.replace(/\/garmonik(\?|$)/, "/garmonik_kassa$1");

const IMPORT_TABLES = [
  "users",
  "patients",
  "service_categories",
  "services",
  "service_price_history",
  "payment_types",
  "clinic_settings",
  "invoices",
  "invoice_items",
  "invoice_payments",
  "expenses",
  "expense_payments",
  "audit_logs",
];

async function tableCount(client, schema, table) {
  const { rows } = await client.query(
    `select count(*)::int as n from ${schema}.${table}`,
  );
  return rows[0]?.n ?? 0;
}

async function copyTable(source, target, table) {
  const { rows } = await source.query(`select * from public.${table}`);
  if (!rows.length) {
    console.log(`  o'tkazildi (bo'sh): ${table}`);
    return 0;
  }

  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `"${c}"`).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");

  let n = 0;
  for (const row of rows) {
    const values = cols.map((c) => row[c]);
    await target.query(
      `insert into kassa.${table} (${colList}) values (${placeholders})
       on conflict (id) do nothing`,
      values,
    );
    n++;
  }
  console.log(`  ${table}: ${n} qator`);
  return n;
}

async function main() {
  console.log("1) SQL migratsiya (kassa schema)...");
  execSync("npm run db:migrate", { stdio: "inherit" });

  console.log("\n2) Prisma kassa jadvallari...");
  execSync(
    "npx prisma db push --schema=prisma/kassa/schema.prisma --accept-data-loss --skip-generate",
    { stdio: "inherit", env: process.env },
  );

  try {
    execSync("node scripts/merge/prisma-generate-kassa.mjs", { stdio: "inherit" });
  } catch {
    console.warn(
      "Prisma generate vaqtincha muvaffaqiyatsiz (dev server faylni qulflagan bo'lishi mumkin).",
    );
    console.warn("Keyin: npm run db:kassa:generate");
  }

  const target = new pg.Client({ connectionString: targetUrl });
  await target.connect();

  const existingUsers = await tableCount(target, "kassa", "users");
  const sameDb = sourceUrl === targetUrl;

  if (sameDb) {
    console.log("\n3) Manba va maqsad bitta DB — import o'tkazildi (allaqachon birlashtirilgan).");
  } else if (existingUsers > 0 && !force) {
    console.log(
      `\n3) kassa.users da ${existingUsers} yozuv bor. Import o'tkazildi.`,
    );
    console.log("   Qayta import: node scripts/merge/phase-2-unify-database.mjs --force");
  } else {
    console.log("\n3) Ma'lumot import: garmonik_kassa -> garmonik.kassa");
    console.log("   Manba:", sourceUrl.replace(/:[^:@/]+@/, ":****@"));

    const source = new pg.Client({ connectionString: sourceUrl });
    await source.connect();

    if (force && existingUsers > 0) {
      console.log("   Eski kassa ma'lumotlari tozalanmoqda...");
      await target.query(`
        truncate table
          kassa.audit_logs,
          kassa.expense_payments,
          kassa.expenses,
          kassa.invoice_payments,
          kassa.invoice_items,
          kassa.invoices,
          kassa.service_price_history,
          kassa.services,
          kassa.service_categories,
          kassa.patients,
          kassa.payment_types,
          kassa.users,
          kassa.clinic_settings
        restart identity cascade
      `);
    }

    for (const table of IMPORT_TABLES) {
      await copyTable(source, target, table);
    }

    await target.query(`
      select setval(
        pg_get_serial_sequence('kassa.invoices', 'invoice_number'),
        coalesce((select max(invoice_number) from kassa.invoices), 1)
      )
    `);

    await source.end();
  }

  await target.end();

  console.log("\n4) .env.local yangilanmoqda (KASSA_DATABASE_URL = DATABASE_URL)...");
  const envPath = path.join(root, ".env.local");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    if (/^\s*KASSA_DATABASE_URL\s*=/m.test(env)) {
      env = env.replace(
        /^\s*KASSA_DATABASE_URL\s*=.*$/m,
        `KASSA_DATABASE_URL=${targetUrl}`,
      );
    } else {
      env += `\nKASSA_DATABASE_URL=${targetUrl}\n`;
    }
    fs.writeFileSync(envPath, env, "utf8");
  }

  console.log("\nTayyor. Tekshiruv: npm run merge:verify-phase-2");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
