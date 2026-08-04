/**
 * Kassa ma'lumotlarini serverdagi garmonik_kassa (public schema) dan
 * yagona garmonik bazasidagi kassa schema ga ko'chirish.
 *
 * Avtomatik manba (deploy:install):
 *   1. Loyiha ildizi: garmonik_kassa.sql  (KASSA_IMPORT_SQL)
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

/** Loyiha ildizidagi garmonik_kassa.sql (mavjud bo'lsa) */
export function resolveBundledKassaSqlDump(root) {
  const bundled = path.join(root, "garmonik_kassa.sql");
  if (fs.existsSync(bundled)) return bundled;
  const configured = defaultSqlDumpPath(root);
  if (fs.existsSync(configured)) return configured;
  return null;
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
    return -1;
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

function loadSqlDumpIntoDatabase(tempDb, sqlPath) {
  const sanitized = prepareSanitizedKassaDump(sqlPath);
  const abs = path.resolve(sanitized);
  if (process.platform === "win32") {
    const tempUrl = replaceDatabaseName(process.env.DATABASE_URL?.trim() || "", tempDb);
    runShell(`psql "${tempUrl}" -v ON_ERROR_STOP=0 -f "${abs}"`, `SQL yuklash: ${abs}`);
    return;
  }
  runShell(
    `sudo -u postgres psql -d "${tempDb}" -v ON_ERROR_STOP=0 -f "${abs}"`,
    `SQL yuklash: ${abs}`,
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

async function copyTable(source, target, table) {
  if (!(await tableExistsInSchema(source, "public", table))) {
    console.log(`  o'tkazildi (manbada yo'q): ${table}`);
    return 0;
  }
  if (!(await tableExistsInSchema(target, "kassa", table))) {
    console.log(`  o'tkazildi (kassa da yo'q): ${table}`);
    return 0;
  }

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

  console.log(`[kassa-import] ${maskUrl(sourceUrl)} -> kassa schema`);
  console.log(`[kassa-import] Manbadan ${sourceUsers} ta foydalanuvchi topildi`);

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

export async function importKassaFromSqlDump(targetUrl, sqlPath, { force = false } = {}) {
  if (!fs.existsSync(sqlPath)) {
    return { imported: false, reason: "sql-not-found", path: sqlPath };
  }

  const tempDb = `garmonik_kassa_import_${Date.now()}`;
  const tempUrl = replaceDatabaseName(targetUrl, tempDb);
  if (!tempUrl) {
    return { imported: false, reason: "invalid-temp-url" };
  }

  const appUser = appDbUserFromUrl(targetUrl);

  try {
    console.log(`[kassa-import] SQL dump -> vaqtinchalik baza -> kassa schema`);
    console.log(`[kassa-import] Manba fayl: ${path.resolve(sqlPath)}`);
    await createTempImportDatabase(tempDb, appUser);
    loadSqlDumpIntoDatabase(tempDb, sqlPath);

    const loadedUsers = countPublicUsersAsPostgres(tempDb);
    if (loadedUsers >= 0) {
      console.log(`[kassa-import] Vaqtinchalik bazada ${loadedUsers} ta kassa foydalanuvchi`);
      if (loadedUsers === 0) {
        throw new Error(
          "garmonik_kassa.sql yuklandi, lekin public.users bo'sh — dump faylini tekshiring",
        );
      }
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

  const sqlPath = resolveBundledKassaSqlDump(root);
  const hasSqlDump = Boolean(sqlPath);

  if (hasSqlDump) {
    console.log(`[kassa-import] Loyiha dump: ${sqlPath}`);
  }

  const shouldForceFromSql =
    force ||
    existing === 0 ||
    (hasSqlDump && existing > 0 && existing <= SEED_USER_CEILING);

  if (existing > 0 && !shouldForceFromSql) {
    console.log(`[kassa-import] Kassa allaqachon to'ldirilgan (${existing} foydalanuvchi).`);
    return { imported: false, reason: "already-has-data", count: existing };
  }

  if (existing > 0 && shouldForceFromSql && hasSqlDump && !force) {
    console.log(
      `[kassa-import] ${existing} foydalanuvchi (seed?) — garmonik_kassa.sql dan qayta import...`,
    );
  }

  if (!isAutoImportEnabled()) {
    console.log("[kassa-import] KASSA_AUTO_IMPORT=false — import o'tkazildi.");
    return { imported: false, reason: "disabled" };
  }

  if (hasSqlDump) {
    console.log(`[kassa-import] garmonik_kassa.sql avtomatik yuklanmoqda...`);
    try {
      const fromSql = await importKassaFromSqlDump(targetUrl, sqlPath, {
        force: shouldForceFromSql,
      });
      if (fromSql.imported) return fromSql;
      console.log(`[kassa-import] SQL dump natija: ${fromSql.reason ?? "import bo'lmadi"}`);
    } catch (e) {
      console.error(
        "[kassa-import] SQL dump import xato:",
        e instanceof Error ? e.message : e,
      );
      if (hasSqlDump) throw e;
    }
  } else {
    console.log(
      `[kassa-import] garmonik_kassa.sql topilmadi (${defaultSqlDumpPath(root)})`,
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
