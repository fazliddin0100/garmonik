/**
 * Bir marta: `npm run db:migrate`
 * Talab: `.env.local` da `DATABASE_URL` (local Postgres yoki Supabase Database URI)
 */

import { getSslConfigForDatabaseUrl } from '@/lib/db/connection';
import { config } from 'dotenv';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

config({ path: '.env.local' });
config({ path: '.env' });

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error(
      'DATABASE_URL topilmadi. Masalan: postgresql://postgres:parol@localhost:5432/garmonik',
    );
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = new pg.Client({
    connectionString: url,
    ssl: getSslConfigForDatabaseUrl(url),
  });

  await client.connect();
  await client.query(`
    create table if not exists public._schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows: applied } = await client.query<{ filename: string }>(
    'select filename from public._schema_migrations',
  );
  const done = new Set(applied.map((r) => r.filename));

  for (const file of files) {
    if (done.has(file)) {
      console.log('○ o‘tkazildi:', file);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    console.log('→ qo‘llanmoqda:', file);
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query(
        'insert into public._schema_migrations (filename) values ($1)',
        [file],
      );
      await client.query('commit');
      console.log('✓', file);
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }

  await client.end();
  console.log('Migratsiyalar tugadi.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
