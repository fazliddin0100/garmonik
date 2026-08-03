/**
 * Birinchi o'rnatish: bazada admin yo'q bo'lsa avtomatik seed.
 *   npm run deploy:bootstrap
 * Docker entrypoint ham shu skriptni chaqiradi.
 */

import { spawnSync } from 'child_process';
import { config } from 'dotenv';
import { closePool, queryOne } from '@/lib/db';

config({ path: '.env.local' });
config({ path: '.env' });

function runSeed(label: string, script: string): void {
  console.log(`\n[bootstrap] ${label}...`);
  const r = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', script],
    { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' },
  );
  if (r.status !== 0) {
    throw new Error(`${label} muvaffaqiyatsiz (kod ${r.status ?? '?'})`);
  }
}

function printCredentials(): void {
  const adminLogin = (process.env.SEED_ADMIN_LOGIN || 'admin').trim();
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const primaryEmail = process.env.SEED_PRIMARY_ADMIN_EMAIL?.trim();
  const primaryPass = process.env.SEED_PRIMARY_ADMIN_PASSWORD?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  console.log('\n========================================');
  console.log('  BIRINCHI KIRISH (admin panel)');
  console.log('========================================');
  console.log(`  Sahifa:  ${appUrl}/auth/login`);
  console.log(`  Login:   ${adminLogin}`);
  console.log(`  Parol:   ${adminPass}`);
  if (primaryEmail && primaryPass) {
    const superLogin = primaryEmail.split('@')[0] || primaryEmail;
    console.log('');
    console.log('  Super admin (Security Center):');
    console.log(`  Login:   ${superLogin}  (email: ${primaryEmail})`);
    console.log(`  Parol:   ${primaryPass}`);
  }
  console.log('');
  console.log('  Kassa admin: admin@klinika / admin123');
  console.log('  Parollarni kirgach o\'zgartiring!');
  console.log('========================================\n');
}

async function tableExists(table: string): Promise<boolean> {
  const row = await queryOne<{ exists: boolean }>(
    `select exists (
       select 1 from information_schema.tables
       where table_schema = 'public' and table_name = $1
     ) as exists`,
    [table],
  );
  return Boolean(row?.exists);
}

async function adminCount(): Promise<number> {
  if (!(await tableExists('portal_user_profiles'))) return 0;
  const row = await queryOne<{ n: number }>(
    `select count(*)::int as n
     from public.portal_user_profiles
     where account_kind = 'admin'`,
  );
  return row?.n ?? 0;
}

async function kassaUserCount(): Promise<number> {
  try {
    const row = await queryOne<{ n: number }>(
      `select count(*)::int as n from kassa.users`,
    );
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.log('[bootstrap] DATABASE_URL yo\'q — o\'tkazildi');
    return;
  }
  if (!process.env.JWT_SECRET?.trim()) {
    console.error('[bootstrap] JWT_SECRET topilmadi — .env ni to\'ldiring');
    process.exit(1);
  }

  const force = process.env.RUN_DB_SEED === 'true' || process.env.FORCE_DB_SEED === '1';
  const count = await adminCount();

  if (count > 0 && !force) {
    console.log(`[bootstrap] Admin allaqachon bor (${count} ta) — seed o\'tkazildi`);
    return;
  }

  if (force && count > 0) {
    console.log('[bootstrap] RUN_DB_SEED=true — to\'liq seed qayta ishga tushirilmoqda');
  } else {
    console.log('[bootstrap] Admin topilmadi — avtomatik o\'rnatish boshlandi');
  }

  runSeed('Klinika seed', 'scripts/seed-postgres.ts');

  const kassaUsers = await kassaUserCount();
  if (kassaUsers > 0) {
    console.log(`[bootstrap] Kassa allaqachon to'ldirilgan (${kassaUsers} foydalanuvchi) — kassa seed o'tkazildi`);
  } else {
    runSeed('Kassa seed', 'prisma/kassa/seed.ts');
  }

  printCredentials();
}

main()
  .catch((e) => {
    console.error('[bootstrap]', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => closePool());
