/**
 * Kassa ma'lumotlarini serverdagi garmonik_kassa (public schema) dan
 * yagona garmonik bazasidagi kassa schema ga ko'chirish.
 */
import fs from "fs";
import path from "path";
import pg from "pg";

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

async function copyTable(source, target, table) {
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

  const adminUrl = postgresAdminUrl(targetUrl);
  if (!adminUrl) {
    return { imported: false, reason: "invalid-url" };
  }

  const tempDb = `garmonik_kassa_import_${Date.now()}`;
  const tempUrl = replaceDatabaseName(targetUrl, tempDb);
  if (!tempUrl) {
    return { imported: false, reason: "invalid-temp-url" };
  }

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();

  try {
    console.log(`[kassa-import] Vaqtinchalik baza: ${tempDb}`);
    await admin.query(`create database "${tempDb}"`);

    const { execSync } = await import("child_process");
    const psqlCmd = process.platform === "win32" ? "psql.exe" : "psql";
    try {
      execSync(`"${psqlCmd}" "${tempUrl}" -v ON_ERROR_STOP=1 -f "${sqlPath}"`, {
        stdio: "inherit",
        env: process.env,
      });
    } catch (e) {
      console.error("[kassa-import] psql bilan SQL yuklash muvaffaqiyatsiz.");
      console.error("  psql o'rnatilganligini tekshiring yoki KASSA_SOURCE_DATABASE_URL ishlating.");
      throw e;
    }

    return importKassaFromPublicSource(tempUrl, targetUrl, { force });
  } finally {
    try {
      await admin.query(`
        select pg_terminate_backend(pid)
        from pg_stat_activity
        where datname = $1 and pid <> pg_backend_pid()
      `, [tempDb]);
      await admin.query(`drop database if exists "${tempDb}"`);
    } catch (e) {
      console.warn(`[kassa-import] Vaqtinchalik bazani o'chirishda xato: ${e.message}`);
    }
    await admin.end();
  }
}

/**
 * Avtomatik import: avval mavjud garmonik_kassa DB, keyin SQL dump.
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

  if (existing > 0 && !force) {
    console.log(`[kassa-import] Kassa allaqachon to'ldirilgan (${existing} foydalanuvchi).`);
    return { imported: false, reason: "already-has-data", count: existing };
  }

  if (process.env.KASSA_AUTO_IMPORT?.trim().toLowerCase() === "false") {
    console.log("[kassa-import] KASSA_AUTO_IMPORT=false — import o'tkazildi.");
    return { imported: false, reason: "disabled" };
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
        `[kassa-import] ${maskUrl(sourceUrl)} ga ulanib bo'lmadi — SQL dump sinab ko'riladi.`,
      );
    }
  }

  const sqlPath = defaultSqlDumpPath(root);
  if (fs.existsSync(sqlPath)) {
    console.log(`[kassa-import] SQL dump: ${sqlPath}`);
    return importKassaFromSqlDump(targetUrl, sqlPath, { force });
  }

  console.log("[kassa-import] Manba topilmadi — yangi kassa seed ishlatiladi.");
  return { imported: false, reason: "no-source" };
}
