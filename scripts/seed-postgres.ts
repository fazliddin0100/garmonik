/**
 * PostgreSQL seed: `npm run db:seed`
 * Talab: `DATABASE_URL`, `JWT_SECRET`, migratsiyalar qo‘llangan.
 */

import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

import { adminRoleLabelToJwtRouteGroup } from '@/lib/admins/portal-routes';
import { createPortalAuthUser } from '@/lib/auth/portal-session';
import {
  allClinicResourceKeys,
  getFullSeedPayloads,
} from '@/lib/seed/full-seed-payloads';
import { validateClinicResourcePayload } from '@/lib/clinic-data/validate-payload';
import { insertPortalProfile } from '@/lib/db/portal-profiles';
import { query, queryOne } from '@/lib/db/query';

async function ensureClinicId(): Promise<string> {
  const existing = await queryOne<{ id: string }>(
    `select id from public.clinics order by created_at asc limit 1`,
  );
  if (existing?.id) {
    console.log('○ Klinika mavjud:', existing.id);
    return existing.id;
  }

  const created = await queryOne<{ id: string }>(
    `insert into public.clinics (name) values ($1) returning id`,
    [''],
  );
  if (!created?.id) throw new Error('Klinika yaratilmadi');
  console.log('✓ Klinika yaratildi:', created.id);
  return created.id;
}

async function seedAdminIfMissing(input: {
  clinicId: string;
  email: string;
  password: string;
  staffLogin: string;
  displayName: string;
  roleLabel: string;
  adminRouteGroup: ReturnType<typeof adminRoleLabelToJwtRouteGroup>;
}): Promise<void> {
  const dup = await queryOne<{ user_id: string }>(
    `select user_id from public.portal_user_profiles
     where account_kind = 'admin'
       and (lower(staff_login) = lower($1) or lower(auth_email) = lower($2))
     limit 1`,
    [input.staffLogin, input.email],
  );
  if (dup) {
    console.log(`○ Admin allaqachon bor: ${input.staffLogin}`);
    return;
  }

  const user = await createPortalAuthUser({
    email: input.email,
    password: input.password,
  });
  await insertPortalProfile({
    user_id: user.id,
    clinic_id: input.clinicId,
    account_kind: 'admin',
    auth_email: input.email.toLowerCase(),
    staff_login: input.staffLogin.toLowerCase(),
    display_name: input.displayName,
    role_label: input.roleLabel,
    admin_route_group: input.adminRouteGroup,
    is_active: true,
  });
  console.log(`✓ Admin: login="${input.staffLogin}" email=${input.email}`);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL topilmadi');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET?.trim()) {
    console.error('JWT_SECRET topilmadi');
    process.exit(1);
  }

  const clinicId = await ensureClinicId();

  const primaryEmail = process.env.SEED_PRIMARY_ADMIN_EMAIL?.trim().toLowerCase();
  const primaryPass = process.env.SEED_PRIMARY_ADMIN_PASSWORD?.trim();
  if (primaryEmail && primaryPass) {
    const loginShort = primaryEmail.split('@')[0] || 'superadmin';
    const roleLabel = 'Super administrator';
    await seedAdminIfMissing({
      clinicId,
      email: primaryEmail,
      password: primaryPass,
      staffLogin: loginShort,
      displayName: 'Super Admin',
      roleLabel,
      adminRouteGroup: adminRoleLabelToJwtRouteGroup(roleLabel, loginShort),
    });
  } else {
    console.log('○ SEED_PRIMARY_ADMIN_EMAIL/PASSWORD — o‘tkazib yuborildi');
  }

  const adminLogin = (process.env.SEED_ADMIN_LOGIN || 'admin').trim().toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const adminEmail = adminLogin.includes('@') ? adminLogin : `${adminLogin}@garmonik.admin.local`;

  await seedAdminIfMissing({
    clinicId,
    email: adminEmail,
    password: adminPass,
    staffLogin: adminLogin,
    displayName: 'Admin Operator',
    roleLabel: 'Klinika direktori',
    adminRouteGroup: adminRoleLabelToJwtRouteGroup('Klinika direktori', adminLogin),
  });

  const resetContent = process.env.SEED_RESET_CONTENT === '1';
  if (resetContent) {
    await query(`update public.clinics set name = '' where id = $1`, [clinicId]);
    console.log('↻ clinics.name — tozalandi');
  }

  const payloads = getFullSeedPayloads();
  for (const key of allClinicResourceKeys()) {
    const row = await queryOne<{ key: string }>(
      `select key from public.clinic_json_resources
       where clinic_id = $1 and key = $2`,
      [clinicId, key],
    );
    const payload = payloads[key];
    validateClinicResourcePayload(key, payload);
    if (row) {
      if (resetContent) {
        await query(
          `update public.clinic_json_resources
           set payload = $3::jsonb, updated_at = now()
           where clinic_id = $1 and key = $2`,
          [clinicId, key, JSON.stringify(payload)],
        );
        console.log(`↻ ${key} — tozalandi`);
      } else {
        console.log(`○ ${key} — mavjud`);
      }
      continue;
    }
    await query(
      `insert into public.clinic_json_resources (clinic_id, key, payload)
       values ($1, $2, $3::jsonb)`,
      [clinicId, key, JSON.stringify(payload)],
    );
    console.log(`✓ ${key} — yozildi`);
  }

  console.log('\nTayyor. Kirish: login + parol (JWT cookie).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
