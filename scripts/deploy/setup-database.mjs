/**
 * Production / virtual server: bitta PostgreSQL ga klinika + kassa sozlash.
 *
 *   npm run deploy:setup-db
 *
 * Ketma-ketlik:
 * 1. Klinika SQL migratsiyalari (public schema)
 * 2. Kassa Prisma schema (kassa schema) — mavjud ma'lumot saqlanadi
 * 3. Serverdagi garmonik_kassa dan avtomatik import (bo'sh bo'lsa)
 * 4. Bootstrap (admin yo'q bo'lsa seed)
 */
import { config } from "dotenv";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { autoImportKassaIfEmpty, kassaUsersCount, maskUrl } from "./kassa-import-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
process.chdir(root);

config({ path: ".env.local" });
config({ path: ".env" });

const forceImport = process.argv.includes("--force-import");

function run(cmd, label) {
  console.log(`\n[setup-db] ${label}...`);
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true });
}

async function ensureKassaSchema(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("create schema if not exists kassa");
    await client.query(
      `comment on schema kassa is 'Kassa tizimi jadvallari (Prisma: prisma/kassa/schema.prisma)'`,
    );
  } finally {
    await client.end();
  }
}

async function main() {
  const targetUrl = process.env.DATABASE_URL?.trim();
  if (!targetUrl) {
    console.error("[setup-db] DATABASE_URL topilmadi — .env faylini to'ldiring");
    process.exit(1);
  }

  console.log("[setup-db] Maqsad DB:", maskUrl(targetUrl));

  run("node scripts/deploy/preflight-production.mjs", "Preflight tekshiruv");

  run("node scripts/deploy/validate-seed-payloads.mjs", "Seed payload tekshiruvi");

  run("npm run db:migrate", "Klinika migratsiyalari");

  await ensureKassaSchema(targetUrl);

  run(
    "npx prisma db push --schema=prisma/kassa/schema.prisma --skip-generate",
    "Kassa jadvallari (Prisma db push)",
  );

  try {
    run("node scripts/merge/prisma-generate-kassa.mjs", "Prisma client generate");
  } catch {
    console.warn("[setup-db] Prisma generate vaqtincha muvaffaqiyatsiz — keyin: npm run db:kassa:generate");
  }

  const importResult = await autoImportKassaIfEmpty(targetUrl, root, {
    force: forceImport,
  });

  const client = new pg.Client({ connectionString: targetUrl });
  await client.connect();
  const users = await kassaUsersCount(client);
  await client.end();

  console.log(`\n[setup-db] Kassa foydalanuvchilar: ${users}`);
  if (importResult.imported) {
    console.log("[setup-db] Server kassa ma'lumotlari muvaffaqiyatli import qilindi.");
  }

  run("npx tsx scripts/deploy/bootstrap-if-empty.ts", "Bootstrap (admin seed)");

  console.log("\n[setup-db] Tayyor.");
  console.log("Keyingi qadam: npm run build && pm2 start ecosystem.config.cjs");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
