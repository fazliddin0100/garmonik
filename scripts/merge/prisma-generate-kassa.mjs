import { config } from "dotenv";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
process.chdir(root);
config({ path: ".env.local" });
config({ path: ".env" });

execSync("npx prisma generate --schema=prisma/kassa/schema.prisma", {
  stdio: "inherit",
  env: process.env,
});
