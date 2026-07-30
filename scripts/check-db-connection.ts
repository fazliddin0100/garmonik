/**
 * PostgreSQL ulanishini tekshirish: `npm run db:check`
 */

import { closePool, query } from '@/lib/db';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const info = await query<{ db: string; version: string }>(
    'select current_database() as db, version() as version',
  );
  const row = info.rows[0];
  console.log('✓ PostgreSQL ulandi');
  console.log('  DB:', row?.db);
  console.log('  ', row?.version?.split('\n')[0]);

  const tables = await query<{ tablename: string }>(
    `select tablename
     from pg_tables
     where schemaname = 'public'
     order by tablename`,
  );
  const names = tables.rows.map((r) => r.tablename);
  console.log(
    '  Jadvallar:',
    names.length ? names.join(', ') : '(hali bo‘sh — npm run db:migrate)',
  );

  const appUsers = await query<{ exists: boolean }>(
    `select exists (
       select 1 from information_schema.tables
       where table_schema = 'public' and table_name = 'app_users'
     ) as exists`,
  );
  if (appUsers.rows[0]?.exists) {
    const count = await query<{ n: string }>(
      'select count(*)::text as n from public.app_users',
    );
    console.log('  app_users:', count.rows[0]?.n ?? '0', 'ta foydalanuvchi');
  }

  await closePool();
}

main().catch((error) => {
  console.error('✗ PostgreSQL ulanmadi:', error instanceof Error ? error.message : error);
  process.exit(1);
});
