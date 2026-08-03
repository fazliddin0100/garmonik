/**
 * Seed payload kalitlari to'liqligini tekshirish (deploy oldidan).
 *   npm run deploy:validate-seed
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
process.chdir(root);

execSync("npx tsx scripts/deploy/validate-seed-payloads.ts", {
  stdio: "inherit",
  env: process.env,
  shell: true,
});
