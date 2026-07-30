import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

async function main() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  process.chdir(root);
  config({ path: ".env.local" });
  config({ path: ".env" });

  const { loginUser } = await import("../../lib/kassa/auth");
  const result = await loginUser("admin@klinika", "admin123");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
