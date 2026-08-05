/**
 * Noto'g'ri pg_restore/pg_dump natijasi: kassa jadvallari public schema da qolgan.
 * Klinika public.patients (uuid) saqlanadi; faqat kassa jadvallari o'chiriladi.
 *
 *   node scripts/deploy/cleanup-public-kassa-tables.mjs
 */
import { config } from "dotenv";
import pg from "pg";
import { cleanupLegacyPublicKassaArtifacts, maskUrl } from "./kassa-import-lib.mjs";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL topilmadi");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    console.log("[cleanup] DB:", maskUrl(url));
    await cleanupLegacyPublicKassaArtifacts(client);
    console.log("[cleanup] Tayyor.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
