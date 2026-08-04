/**
 * Kassa ma'lumotlarini eski dump/bazadan kassa schema ga ko'chirish.
 *
 * Eski kassa: public.users, public.invoices, ...
 * Yangi ilova: kassa.users, kassa.invoices, ...
 * Klinika: public.patients (uuid) — alohida, tegilmaydi.
 *
 * Avtomatik manba (deploy:install):
 *   1. garmonik_kassa.dump yoki garmonik_kassa.sql (loyiha / KASSA_IMPORT_SQL)
 *   2. Server DB: garmonik_kassa
 */
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import pg from "pg";

/** Seed dan ko'p bo'lmagan foydalanuvchi — SQL dump qayta import qilinadi */
const SEED_USER_CEILING = 4;

export const IMPORT_TABLES = [
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

/** pg_restore noto'g'ri public ga tushirgan kassa jadvallari (klinika emas) */
export const LEGACY_PUBLIC_KASSA_TABLES = [
  "audit_logs",
  "expense_payments",
  "expenses",
  "invoice_payments",
  "invoice_items",
  "invoices",
  "service_price_history",
  "services",
  "service_categories",
  "payment_types",
  "users",
  "clinic_settings",
];

export function maskUrl(url) {
  return url.replace(/:[^:@/]+@/, ":****@");
}

export function replaceDatabaseName(url, dbName) {
  try {
    const normalized = url.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:");
    const u = new URL(normalized);
    u.pathname = `/${dbName}`;
    return u.toString().replace(/^http:/, "postgresql:");
  } catch {
    return null;
  }
}

export function getDatabaseName(url) {
  try {
    const normalized = url.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:");
    const u = new URL(normalized);
    return u.pathname.slice(1).split("?")[0] || "";
  } catch {
    return "";
  }
}

export function postgresAdminUrl(url) {
  return replaceDatabaseName(url, "postgres");
}

export async function tableCount(client, schema, table) {
  const { rows } = await client.query(
    `select count(*)::int as n from ${schema}.${table}`,
  );
  return rows[0]?.n ?? 0;
}

export async function schemaExists(client, schema) {
  const { rows } = await client.query(
    `select exists (
       select 1 from information_schema.schemata where schema_name = $1
     ) as exists`,
    [schema],
  );
  return Boolean(rows[0]?.exists);
}

export async function tableExistsInSchema(client, schema, table) {
  const { rows } = await client.query(
    `select exists (
       select 1 from information_schema.tables
       where table_schema = $1 and table_name = $2
     ) as exists`,
    [schema, table],
  );
  return Boolean(rows[0]?.exists);
}

/** kassa.users soni (schema yo'q bo'lsa 0) */
export async function kassaUsersCount(client) {
  if (!(await schemaExists(client, "kassa"))) return 0;
  if (!(await tableExistsInSchema(client, "kassa", "users"))) return 0;
  return tableCount(client, "kassa", "users");
}

/** Manba: public.users (garmonik_kassa dump/server) */
export async function publicKassaUsersCount(client) {
  if (!(await tableExistsInSchema(client, "public", "users"))) return 0;
  const { rows } = await client.query(
    `select count(*)::int as n from public.users where login is not null`,
  );
  return rows[0]?.n ?? 0;
}

export function deriveKassaSourceUrl(targetUrl) {
  const explicit = process.env.KASSA_SOURCE_DATABASE_URL?.trim();
  if (explicit) return explicit;

  const dbName = getDatabaseName(targetUrl);
  if (dbName === "garmonik_kassa") return targetUrl;

  const derived = replaceDatabaseName(targetUrl, "garmonik_kassa");
  return derived;
}

export function defaultSqlDumpPath(root) {
  const envPath = process.env.KASSA_IMPORT_SQL?.trim();
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.join(root, envPath);
  }
  return path.join(root, "garmonik_kassa.sql");
}

/** garmonik_kassa.dump yoki .sql — loyiha ildizi, ~/, yoki KASSA_IMPORT_SQL */
export function resolveBundledKassaDump(root) {
  const candidates = [];

  const envPath = process.env.KASSA_IMPORT_SQL?.trim();
  if (envPath) {
    candidates.push(path.isAbsolute(envPath) ? envPath : path.join(root, envPath));
  }

  candidates.push(
    path.join(root, "garmonik_kassa.dump"),
    path.join(root, "garmonik_kassa.sql"),
    path.join(os.homedir(), "garmonik_kassa.dump"),
    path.join(os.homedir(), "garmonik_kassa.sql"),
  );

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

/** @deprecated resolveBundledKassaDump ishlating */
export function resolveBundledKassaSqlDump(root) {
  return resolveBundledKassaDump(root);
}

async function isKassaStylePublicPatients(client) {
  if (!(await tableExistsInSchema(client, "public", "patients"))) return false;
  const { rows } = await client.query(`
    select data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'patients' and column_name = 'id'
  `);
  const t = rows[0]?.data_type ?? "";
  return t === "text" || t === "character varying";
}

/** public schema dagi noto'g'ri kassa qoldiqlarini o'chirish */
export async function cleanupLegacyPublicKassaArtifacts(client) {
  console.log("[kassa-import] public schema: eski kassa qoldiqlari tozalanmoqda...");

  if (await isKassaStylePublicPatients(client)) {
    console.log("[kassa-import]   drop public.patients (kassa dump, text id)");
    await client.query("drop table if exists public.patients cascade");
  } else {
    console.log("[kassa-import]   public.patients saqlanadi (klinika, uuid)");
  }

  for (const table of LEGACY_PUBLIC_KASSA_TABLES) {
    if (!(await tableExistsInSchema(client, "public", table))) continue;
    if (table === "users") {
      const { rows } = await client.query(
        `
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'users' and column_name = 'login'
        `,
      );
      if (rows.length === 0) {
        console.log("[kassa-import]   skip public.users (login ustuni yo'q)");
        continue;
      }
    }
    console.log(`[kassa-import]   drop public.${table}`);
    await client.query(`drop table if exists public."${table}" cascade`);
  }

  for (const typeName of [
    "ExpenseStatus",
    "InvoiceStatus",
    "PaymentPlatform",
    "UserRole",
  ]) {
    await client.query(`drop type if exists public."${typeName}" cascade`);
  }
}

function isAutoImportEnabled() {
  const v = process.env.KASSA_AUTO_IMPORT?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  return true;
}

function runShell(cmd, label) {
  console.log(`[kassa-import] ${label}`);
  execSync(cmd, { stdio: "inherit", env: process.env, shell: true });
}

function runShellOutput(cmd) {
  return execSync(cmd, { encoding: "utf8", env: process.env, shell: true }).trim();
}

/**
 * pg_dump 16+ \restrict va garmonik_user OWNER — VPS da psql xato bermasligi uchun.
 */
export function prepareSanitizedKassaDump(sqlPath) {
  const raw = fs.readFileSync(sqlPath, "utf8");
  const sanitized = raw
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*\\restrict\b/i.test(line) && !/^\s*\\unrestrict\b/i.test(line),
    )
    .map((line) => line.replace(/\bgarmonik_user\b/g, "postgres"))
    .join("\n");

  const out = path.join(
    os.tmpdir(),
    `garmonik_kassa_sanitized_${Date.now()}.sql`,
  );
  fs.writeFileSync(out, sanitized, "utf8");
  console.log(`[kassa-import] Dump tozalandi: ${out}`);
  return out;
}

function countPublicUsersAsPostgres(tempDb) {
  if (process.platform === "win32") return -1;
  try {
    const out = runShellOutput(
      `sudo -u postgres psql -d "${tempDb}" -t -A -c "select count(*)::int from public.users where login is not null"`,
    );
    return Number.parseInt(out, 10) || 0;
  } catch {
    return 0;
  }
}

/** Linux VPS: postgres superuser (peer) orqali createdb/psql */
function runAsPostgres(args) {
  if (process.platform === "win32") {
    runShell(`psql ${args}`, `psql ${args}`);
    return;
  }
  runShell(`sudo -u postgres psql ${args}`, `sudo postgres psql ${args}`);
}

async function createTempImportDatabase(tempDb, appUser) {
  if (process.platform === "win32") {
    const adminUrl = process.env.DATABASE_URL?.trim();
    const postgresUrl = postgresAdminUrl(adminUrl || "");
    if (!postgresUrl) throw new Error("DATABASE_URL noto'g'ri");
    const admin = new pg.Client({ connectionString: postgresUrl });
    await admin.connect();
    try {
      await admin.query(`create database "${tempDb}"`);
    } finally {
      await admin.end();
    }
    return;
  }

  runShell(`sudo -u postgres createdb "${tempDb}"`, `vaqtinchalik baza: ${tempDb}`);
}

function grantAppUserReadTempDb(tempDb, appUser) {
  if (!appUser || process.platform === "win32") return;

  runAsPostgres(
    `-v ON_ERROR_STOP=1 -d "${tempDb}" -c "GRANT CONNECT ON DATABASE \\"${tempDb}\\" TO \\"${appUser}\\";"`,
  );
  runAsPostgres(
    `-v ON_ERROR_STOP=1 -d "${tempDb}" -c "GRANT USAGE ON SCHEMA public TO \\"${appUser}\\"; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \\"${appUser}\\"; GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO \\"${appUser}\\";"`,
  );
}

async function dropTempImportDatabase(tempDb) {
  if (process.platform === "win32") {
    const adminUrl = postgresAdminUrl(process.env.DATABASE_URL?.trim() || "");
    if (!adminUrl) return;
    const admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    try {
      await admin.query(`
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where datname = $1 and pid <> pg_backend_pid()
      `, [tempDb]);
      await admin.query(`drop database if exists "${tempDb}"`);
    } finally {
      await admin.end();
    }
    return;
  }

  runAsPostgres(
    `-v ON_ERROR_STOP=1 -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '${tempDb}' and pid <> pg_backend_pid();"`,
  );
  runShell(`sudo -u postgres dropdb --if-exists "${tempDb}"`, `vaqtinchalik baza o'chirildi: ${tempDb}`);
}

function copyDumpReadableByPostgres(dumpPath) {
  const abs = path.resolve(dumpPath);
  if (process.platform === "win32") return abs;

  const dest = path.join(
    os.tmpdir(),
    `garmonik_kassa_${Date.now()}${path.extname(abs) || ".dump"}`,
  );
  fs.copyFileSync(abs, dest);
  fs.chmodSync(dest, 0o644);
  console.log(`[kassa-import] Dump /tmp ga nusxalandi (postgres o'qishi uchun): ${dest}`);
  return dest;
}

function loadDumpIntoTempDatabase(tempDb, dumpPath) {
  const abs = path.resolve(dumpPath);
  const isCustom = abs.toLowerCase().endsWith(".dump");
  const readablePath =
    process.platform === "win32" ? abs : copyDumpReadableByPostgres(abs);

  if (isCustom) {
    if (process.platform === "win32") {
      const tempUrl = replaceDatabaseName(process.env.DATABASE_URL?.trim() || "", tempDb);
      runShell(
        `pg_restore --no-owner --no-acl -d "${tempUrl}" "${readablePath}"`,
        `pg_restore: ${readablePath}`,
      );
      return;
    }
    try {
      runShell(
        `sudo -u postgres pg_restore --no-owner --no-acl -d "${tempDb}" "${readablePath}"`,
        `pg_restore: ${readablePath}`,
      );
    } catch {
      console.warn(
        "[kassa-import] pg_restore ba'zi ogohlantirishlar bilan tugadi — foydalanuvchi soni tekshiriladi",
      );
    }
    return;
  }

  const sanitized = prepareSanitizedKassaDump(readablePath);
  if (process.platform === "win32") {
    const tempUrl = replaceDatabaseName(process.env.DATABASE_URL?.trim() || "", tempDb);
    runShell(`psql "${tempUrl}" -v ON_ERROR_STOP=0 -f "${sanitized}"`, `SQL: ${sanitized}`);
    return;
  }
  runShell(
    `sudo -u postgres psql -d "${tempDb}" -v ON_ERROR_STOP=0 -f "${sanitized}"`,
    `SQL: ${sanitized}`,
  );
}

function appDbUserFromUrl(url) {
  try {
    const normalized = url.replace(/^postgresql:/, "http:").replace(/^postgres:/, "http:");
    return decodeURIComponent(new URL(normalized).username || "");
  } catch {
    return "";
  }
}

async function getTableColumns(client, schema, table) {
  const { rows } = await client.query(
    `
    select column_name
    from information_schema.columns
    where table_schema = $1 and table_name = $2
    order by ordinal_position
    `,
    [schema, table],
  );
  return rows.map((r) => r.column_name);
}

async function copyTable(source, target, table) {
  if (!(await tableExistsInSchema(source, "public", table))) {
    console.log(`  o'tkazildi (manbada yo'q): ${table}`);
    return 0;
  }
  if (!(await tableExistsInSchema(target, "kassa", table))) {
    console.log(`  o'tkazildi (kassa da yo'q): ${table}`);
    return 0;
  }

  const sourceCols = await getTableColumns(source, "public", table);
  const targetCols = await getTableColumns(target, "kassa", table);
  const cols = sourceCols.filter((c) => targetCols.includes(c));
  if (!cols.length) {
    console.log(`  o'tkazildi (ustun mos emas): ${table}`);
    return 0;
  }

  const colList = cols.map((c) => `"${c}"`).join(", ");
  const { rows } = await source.query(`select ${colList} from public.${table}`);
  if (!rows.length) {
    console.log(`  o'tkazildi (bo'sh): ${table}`);
    return 0;
  }

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

export async function importKassaFromPublicSource(sourceUrl, targetUrl, { force = false } = {}) {
  const target = new pg.Client({ connectionString: targetUrl });
  await target.connect();

  const existingUsers = await kassaUsersCount(target);
  const sameDb = sourceUrl === targetUrl;

  if (sameDb) {
    console.log("[kassa-import] Manba va maqsad bitta DB — import o'tkazildi.");
    await target.end();
    return { imported: false, reason: "same-db" };
  }

  if (existingUsers > 0 && !force) {
    console.log(
      `[kassa-import] kassa.users da ${existingUsers} yozuv bor — import o'tkazildi.`,
    );
    await target.end();
    return { imported: false, reason: "already-has-data", count: existingUsers };
  }

  const source = new pg.Client({ connectionString: sourceUrl });
  await source.connect();

  const sourceUsers = await publicKassaUsersCount(source);
  if (sourceUsers === 0) {
    await source.end();
    await target.end();
    return { imported: false, reason: "source-empty" };
  }

  console.log(`[kassa-import] public (eski dump) -> kassa schema`);
  console.log(`[kassa-import] Manbadan ${sourceUsers} ta kassa foydalanuvchi`);

  if (force && existingUsers > 0) {
    console.log("[kassa-import] Eski kassa ma'lumotlari tozalanmoqda...");
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
  await target.end();
  return { imported: true, sourceUsers };
}

export async function importKassaFromDumpFile(targetUrl, dumpPath, { force = false } = {}) {
  if (!fs.existsSync(dumpPath)) {
    return { imported: false, reason: "dump-not-found", path: dumpPath };
  }

  const tempDb = `garmonik_kassa_import_${Date.now()}`;
  const tempUrl = replaceDatabaseName(targetUrl, tempDb);
  if (!tempUrl) {
    return { imported: false, reason: "invalid-temp-url" };
  }

  const appUser = appDbUserFromUrl(targetUrl);

  const targetPrep = new pg.Client({ connectionString: targetUrl });
  await targetPrep.connect();
  try {
    await cleanupLegacyPublicKassaArtifacts(targetPrep);
  } finally {
    await targetPrep.end();
  }

  try {
    console.log(`[kassa-import] Eski dump -> vaqtinchalik baza -> kassa schema`);
    console.log(`[kassa-import] Fayl: ${path.resolve(dumpPath)}`);
    await createTempImportDatabase(tempDb, appUser);
    loadDumpIntoTempDatabase(tempDb, dumpPath);

    const loadedUsers = countPublicUsersAsPostgres(tempDb);
    console.log(`[kassa-import] Vaqtinchalik bazada ${loadedUsers} ta kassa foydalanuvchi`);
    if (loadedUsers === 0) {
      throw new Error(
        "Dump yuklanmadi (public.users bo'sh). pg_restore xato bo'lgan bo'lishi mumkin — logni yuqorida tekshiring.",
      );
    }

    grantAppUserReadTempDb(tempDb, appUser);
    return importKassaFromPublicSource(tempUrl, targetUrl, { force: true });
  } finally {
    try {
      await dropTempImportDatabase(tempDb);
    } catch (e) {
      console.warn(`[kassa-import] Vaqtinchalik bazani o'chirishda xato: ${e.message}`);
    }
  }
}

/** @deprecated importKassaFromDumpFile ishlating */
export async function importKassaFromSqlDump(targetUrl, sqlPath, options) {
  return importKassaFromDumpFile(targetUrl, sqlPath, options);
}

/**
 * Avtomatik import: avval loyiha ildizidagi garmonik_kassa.sql, keyin garmonik_kassa DB.
 */
export async function autoImportKassaIfEmpty(targetUrl, root, { force = false } = {}) {
  const existing = await (async () => {
    const c = new pg.Client({ connectionString: targetUrl });
    await c.connect();
    try {
      return await kassaUsersCount(c);
    } finally {
      await c.end();
    }
  })();

  const dumpPath = resolveBundledKassaDump(root);
  const hasDump = Boolean(dumpPath);

  if (hasDump) {
    console.log(`[kassa-import] Kassa dump topildi: ${dumpPath}`);
  }

  const shouldForceFromDump =
    force ||
    existing === 0 ||
    (hasDump && existing > 0 && existing <= SEED_USER_CEILING);

  if (existing > 0 && !shouldForceFromDump) {
    console.log(`[kassa-import] Kassa allaqachon to'ldirilgan (${existing} foydalanuvchi).`);
    return { imported: false, reason: "already-has-data", count: existing };
  }

  if (existing > 0 && shouldForceFromDump && hasDump && !force) {
    console.log(
      `[kassa-import] ${existing} foydalanuvchi — dump dan qayta import (public -> kassa)...`,
    );
  }

  if (!isAutoImportEnabled()) {
    console.log("[kassa-import] KASSA_AUTO_IMPORT=false — import o'tkazildi.");
    return { imported: false, reason: "disabled" };
  }

  if (hasDump) {
    console.log(`[kassa-import] Avtomatik import boshlandi...`);
    try {
      const fromDump = await importKassaFromDumpFile(targetUrl, dumpPath, {
        force: shouldForceFromDump,
      });
      if (fromDump.imported) return fromDump;
      console.log(`[kassa-import] Dump natija: ${fromDump.reason ?? "import bo'lmadi"}`);
    } catch (e) {
      console.error(
        "[kassa-import] Dump import xato:",
        e instanceof Error ? e.message : e,
      );
      throw e;
    }
  } else {
    console.log(
      `[kassa-import] Dump topilmadi (garmonik_kassa.dump / garmonik_kassa.sql)`,
    );
  }

  const sourceUrl = deriveKassaSourceUrl(targetUrl);
  if (sourceUrl && sourceUrl !== targetUrl) {
    const probe = new pg.Client({ connectionString: sourceUrl });
    try {
      await probe.connect();
      const n = await publicKassaUsersCount(probe);
      await probe.end();
      if (n > 0) {
        console.log("[kassa-import] Serverdagi garmonik_kassa bazasidan import...");
        return importKassaFromPublicSource(sourceUrl, targetUrl, { force });
      }
    } catch {
      try {
        await probe.end();
      } catch {
        /* ignore */
      }
      console.log(
        `[kassa-import] ${maskUrl(sourceUrl)} ga ulanib bo'lmadi.`,
      );
    }
  }

  console.log("[kassa-import] Manba topilmadi — yangi kassa seed ishlatiladi.");
  return { imported: false, reason: "no-source" };
}
