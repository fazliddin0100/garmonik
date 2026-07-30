/**
 * garmonik-kassa/.env dan KASSA_DATABASE_URL ni .env.local ga qo'shadi (yo'q bo'lsa).
 *   node scripts/merge/sync-kassa-env.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const garmonikRoot = path.join(__dirname, "..", "..");
const kassaEnvPath = path.join(garmonikRoot, "..", "garmonik-kassa", ".env");
const localEnvPath = path.join(garmonikRoot, ".env.local");

function readDatabaseUrl(filePath) {
  if (!fs.existsSync(filePath)) return null;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*"?([^"#]+)"?/);
    if (m) return m[1].trim().replace(/\?schema=public$/, "");
  }
  return null;
}

const kassaUrl = readDatabaseUrl(kassaEnvPath);
if (!kassaUrl) {
  console.error("garmonik-kassa/.env da DATABASE_URL topilmadi");
  process.exit(1);
}

let local = fs.existsSync(localEnvPath) ? fs.readFileSync(localEnvPath, "utf8") : "";
if (/^\s*KASSA_DATABASE_URL\s*=/m.test(local)) {
  console.log("KASSA_DATABASE_URL allaqachon .env.local da mavjud");
  process.exit(0);
}

const block = [
  "",
  "# Kassa moduli (merge bosqich 1)",
  `KASSA_DATABASE_URL=${kassaUrl}`,
  'NEXT_PUBLIC_CLINIC_NAME="Gormonik Plus Klinik"',
  "NEXT_PUBLIC_RECEIPT_PRINT_AGENT_URL=http://127.0.0.1:17888",
  "RECEIPT_PRINTER_ENABLED=true",
  "",
].join("\n");

fs.appendFileSync(localEnvPath, block, "utf8");
console.log("KASSA_DATABASE_URL .env.local ga qo'shildi");
