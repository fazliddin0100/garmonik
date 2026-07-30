/**
 * Bosqich 1: garmonik-kassa fayllarini garmonik ga ko'chirish + import/route yangilash.
 *   node scripts/merge/copy-kassa-phase-1.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const garmonikRoot = path.join(__dirname, "..", "..");
const kassaRoot = path.join(garmonikRoot, "..", "garmonik-kassa");

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".css",
  ".json",
  ".md",
  ".bat",
  ".txt",
  ".vbs",
  ".ps1",
]);

/** @type {{ from: string; to: string; file?: string }[]} */
const COPY_JOBS = [
  { from: "src/lib", to: "lib/kassa" },
  { from: "src/components", to: "components/kassa" },
  { from: "src/app/kassa", to: "app/kassa" },
  { from: "src/app/login/page.tsx", to: "app/kassa/login/page.tsx", file: true },
  { from: "src/app/admin", to: "app/kassa-admin" },
  { from: "src/app/api", to: "app/api/kassa" },
  { from: "src/app/globals.css", to: "app/kassa/kassa.css", file: true },
  { from: "prisma", to: "prisma/kassa" },
  { from: "print-agent", to: "print-agent" },
  {
    from: "scripts/generate-logo-escpos.mjs",
    to: "scripts/kassa/generate-logo-escpos.mjs",
    file: true,
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  }
}

function transformContent(text) {
  let out = text;

  out = out.replace(/@\/lib\//g, "@/lib/kassa/");
  out = out.replace(/@\/components\//g, "@/components/kassa/");

  out = out.replace(/"\/api\//g, "\"/api/kassa/");
  out = out.replace(/'\/api\//g, "'/api/kassa/");
  out = out.replace(/`\/api\//g, "`/api/kassa/");

  out = out.replace(/redirect\("\/login"\)/g, 'redirect("/kassa/login")');
  out = out.replace(/redirect\('\/login'\)/g, "redirect('/kassa/login')");
  out = out.replace(/new URL\("\/login"/g, 'new URL("/kassa/login"');
  out = out.replace(/new URL\('\/login'/g, "new URL('/kassa/login'");

  out = out.replace(/"\/login"/g, '"/kassa/login"');
  out = out.replace(/'\/login'/g, "'/kassa/login'");

  out = out.replace(/"\/admin"/g, '"/kassa-admin"');
  out = out.replace(/'\/admin'/g, "'/kassa-admin'");
  out = out.replace(/`\/admin`/g, "`/kassa-admin`");
  out = out.replace(/"\/admin\//g, '"/kassa-admin/');
  out = out.replace(/'\/admin\//g, "'/kassa-admin/");

  // /kassa yo'li o'zgarmaydi; login redirect admin/cashier
  out = out.replace(
    /role === "ADMIN" \? "\/kassa-admin" : "\/kassa"/g,
    'role === "ADMIN" ? "/kassa-admin" : "/kassa"',
  );

  return out;
}

function processTree(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processTree(full);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    const raw = fs.readFileSync(full, "utf8");
    const next = transformContent(raw);
    if (next !== raw) fs.writeFileSync(full, next, "utf8");
  }
}

if (!fs.existsSync(kassaRoot)) {
  console.error("garmonik-kassa topilmadi:", kassaRoot);
  process.exit(1);
}

console.log("Ko'chirish: garmonik-kassa -> garmonik");
for (const job of COPY_JOBS) {
  const src = path.join(kassaRoot, job.from);
  const dest = path.join(garmonikRoot, job.to);
  if (!fs.existsSync(src)) {
    console.warn("O'tkazildi (yo'q):", job.from);
    continue;
  }
  if (job.file) {
    copyFile(src, dest);
    console.log("  fayl:", job.to);
  } else {
    copyDir(src, dest);
    console.log("  papka:", job.to);
  }
}

console.log("Import va route yangilanmoqda...");
const targets = [
  path.join(garmonikRoot, "lib/kassa"),
  path.join(garmonikRoot, "components/kassa"),
  path.join(garmonikRoot, "app/kassa"),
  path.join(garmonikRoot, "app/kassa-admin"),
  path.join(garmonikRoot, "app/api/kassa"),
  path.join(garmonikRoot, "prisma/kassa"),
];
for (const t of targets) {
  if (fs.existsSync(t)) processTree(t);
}

console.log("Tayyor.");
