/**
 * Faqat kassa import (Docker entrypoint va qo'lda ishlatish).
 *   node scripts/deploy/kassa-import-only.mjs
 *   node scripts/deploy/kassa-import-only.mjs --force
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import {
  autoImportKassaIfEmpty,
  kassaUsersCount,
  maskUrl,
} from "./kassa-import-lib.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
process.chdir(root);

config({ path: ".env.local" });
config({ path: ".env" });

const force = process.argv.includes("--force") || process.argv.includes("--force-import");

async function ensureKassaSchema(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("create schema if not exists kassa");
  } finally {
    await client.end();
  }
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.log("[kassa-import] DATABASE_URL yo'q — o'tkazildi");
    return;
  }

  console.log("[kassa-import] DB:", maskUrl(url));
  await ensureKassaSchema(url);

  const result = await autoImportKassaIfEmpty(url, root, { force });

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const n = await kassaUsersCount(client);
  await client.end();

  console.log(`[kassa-import] Jami foydalanuvchilar: ${n}`);
  if (result.imported) {
    console.log("[kassa-import] Import muvaffaqiyatli.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
