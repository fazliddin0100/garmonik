import {
  createPortalAuthUser,
  deletePortalAuthUser,
  updatePortalAuthPassword,
} from '@/lib/auth/portal-session';
import {
  findPortalLoginByCredential,
  insertPortalProfile,
  updatePortalProfile,
  type PortalProfileRow,
} from '@/lib/db/portal-profiles';
import { query, queryOne } from '@/lib/db/query';
import {
  readClinicResourcePayload,
  upsertClinicResourcePayload,
} from '@/lib/db/clinic-json-resources';
import type { ReceptionUser } from '@/lib/reception/types';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { staffAuthEmail } from '@/lib/staff-portal/auth-email';

const PROFILE_COLUMNS = `
  user_id, clinic_id, account_kind, auth_email, admin_route_group,
  staff_role, display_name, role_label, staff_login, legacy_external_id,
  department, is_active, phone, created_at
`;

export type ReceptionStaffInput = {
  id?: string;
  fullName: string;
  roleName: string;
  department?: string;
  login: string;
  password?: string;
  email?: string;
};

function asReceptionArray(value: unknown): ReceptionUser[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is ReceptionUser =>
      !!row &&
      typeof row === 'object' &&
      typeof (row as ReceptionUser).id === 'string' &&
      typeof (row as ReceptionUser).username === 'string',
  );
}

function rowFromProfile(profile: PortalProfileRow): ReceptionUser {
  return {
    id: profile.legacy_external_id || profile.user_id,
    shortName: profile.display_name,
    roleName: profile.role_label?.trim() || 'Registrator',
    department: profile.department?.trim() || '',
    username: (profile.staff_login || profile.auth_email).toLowerCase(),
    lastAccess: '',
    email: profile.phone?.trim() || '',
    status: profile.is_active ? 'Актив' : 'Nofaol',
    password: '',
    securityPin: '1111',
  };
}

function toClinicJsonRow(row: ReceptionUser): ReceptionUser {
  return {
    ...row,
    password: '',
  };
}

async function findReceptionProfileByExternalId(
  externalId: string,
): Promise<PortalProfileRow | null> {
  const kabinetStaff = await queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'staff'
       and staff_role = 'kabinet'
       and legacy_external_id = $1
     limit 1`,
    [externalId],
  );
  if (kabinetStaff) return kabinetStaff;

  return queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'admin'
       and admin_route_group = 'reception'
       and legacy_external_id = $1
     limit 1`,
    [externalId],
  );
}

async function syncClinicJsonRows(rows: ReceptionUser[]): Promise<void> {
  const clinicId = await getDefaultClinicId();
  await upsertClinicResourcePayload(
    clinicId,
    'reception',
    rows.map(toClinicJsonRow),
  );
}

async function syncClinicJsonRow(row: ReceptionUser): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'reception');
  const existing = asReceptionArray(payload);
  const without = existing.filter((item) => item.id !== row.id);
  await upsertClinicResourcePayload(clinicId, 'reception', [
    toClinicJsonRow(row),
    ...without.map(toClinicJsonRow),
  ]);
}

async function removeClinicJsonRow(id: string): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'reception');
  const existing = asReceptionArray(payload).filter((item) => item.id !== id);
  await upsertClinicResourcePayload(
    clinicId,
    'reception',
    existing.map(toClinicJsonRow),
  );
}

async function migrateAdminReceptionToKabinetStaff(): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const result = await query<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where clinic_id = $1
       and account_kind = 'admin'
       and admin_route_group = 'reception'`,
    [clinicId],
  );

  for (const profile of result.rows) {
    try {
      await updatePortalProfile(clinicId, profile.user_id, {
        account_kind: 'staff',
        staff_role: 'kabinet',
        admin_route_group: null,
        department: profile.department?.trim() || 'Qabulxona',
        role_label: profile.role_label?.trim() || 'Registrator',
      });
    } catch (error) {
      console.error('reception admin→kabinet migrate', profile.staff_login, error);
    }
  }
}

async function provisionLegacyReceptionAccount(row: ReceptionUser): Promise<void> {
  const login = row.username.trim().toLowerCase();
  const password = row.password?.trim() ?? '';
  if (!row.shortName.trim() || !login || password.length < 6) return;

  const existing = await findReceptionProfileByExternalId(row.id);
  if (existing) return;

  const taken = await findPortalLoginByCredential(login);
  if (taken) return;

  await createReceptionStaffAccount({
    id: row.id,
    fullName: row.shortName.trim(),
    roleName: row.roleName.trim() || 'Registrator',
    login,
    password,
    email: row.email.trim(),
  });
}

async function migrateLegacyReceptionAccounts(): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'reception');
  const legacy = asReceptionArray(payload);
  for (const row of legacy) {
    try {
      await provisionLegacyReceptionAccount(row);
    } catch (error) {
      console.error('reception legacy migrate', row.username, error);
    }
  }
}

export async function listReceptionStaffAccounts(): Promise<ReceptionUser[]> {
  await migrateLegacyReceptionAccounts();
  await migrateAdminReceptionToKabinetStaff();

  const clinicId = await getDefaultClinicId();
  const result = await query<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where clinic_id = $1
       and account_kind = 'staff'
       and staff_role = 'kabinet'
     order by display_name asc`,
    [clinicId],
  );

  const rows = result.rows.map(rowFromProfile);
  await syncClinicJsonRows(rows);
  return rows;
}

export async function createReceptionStaffAccount(
  input: ReceptionStaffInput,
): Promise<ReceptionUser> {
  const login = input.login.trim().toLowerCase();
  const password = input.password?.trim() ?? '';
  if (!input.fullName.trim() || !login) {
    throw new Error('F.I.Sh va login majburiy');
  }
  if (password.length < 6) {
    throw new Error('Parol kamida 6 belgidan iborat bo‘lishi kerak');
  }

  const taken = await findPortalLoginByCredential(login);
  if (taken) throw new Error('Bu login band');

  const clinicId = await getDefaultClinicId();
  const id = input.id?.trim() || crypto.randomUUID();
  const email = staffAuthEmail(login);
  const created = await createPortalAuthUser({ email, password });

  const department = input.department?.trim() || '';
  const roleLabel = input.roleName.trim() || 'Registrator';

  await insertPortalProfile({
    user_id: created.id,
    clinic_id: clinicId,
    account_kind: 'staff',
    auth_email: email,
    admin_route_group: null,
    staff_role: 'kabinet',
    display_name: input.fullName.trim(),
    role_label: roleLabel,
    staff_login: login,
    legacy_external_id: id,
    department: department || roleLabel,
    phone: input.email?.trim() || null,
    is_active: true,
  });

  const row: ReceptionUser = {
    id,
    shortName: input.fullName.trim(),
    roleName: roleLabel,
    department,
    username: login,
    lastAccess: '',
    email: input.email?.trim() || '',
    status: 'Актив',
    password: '',
    securityPin: '1111',
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function updateReceptionStaffAccount(
  input: ReceptionStaffInput & { id: string },
): Promise<ReceptionUser> {
  const login = input.login.trim().toLowerCase();
  if (!input.fullName.trim() || !login) {
    throw new Error('F.I.Sh va login majburiy');
  }

  let profile = await findReceptionProfileByExternalId(input.id);
  if (!profile) {
    throw new Error('Qabul xodimi topilmadi');
  }

  const clinicId = await getDefaultClinicId();
  if (profile.account_kind === 'admin' && profile.admin_route_group === 'reception') {
    await updatePortalProfile(clinicId, profile.user_id, {
      account_kind: 'staff',
      staff_role: 'kabinet',
      admin_route_group: null,
    });
    profile = {
      ...profile,
      account_kind: 'staff',
      staff_role: 'kabinet',
      admin_route_group: null,
    };
  }

  const currentLogin = (profile.staff_login || profile.auth_email).toLowerCase();
  if (login !== currentLogin) {
    const taken = await findPortalLoginByCredential(login);
    if (taken && taken.user_id !== profile.user_id) {
      throw new Error('Bu login band');
    }
  }

  const department = input.department?.trim() || '';
  const roleLabel = input.roleName.trim() || 'Registrator';

  await updatePortalProfile(clinicId, profile.user_id, {
    display_name: input.fullName.trim(),
    role_label: roleLabel,
    staff_login: login,
    auth_email: staffAuthEmail(login),
    phone: input.email?.trim() || null,
    department: department || roleLabel,
    is_active: true,
    account_kind: 'staff',
    staff_role: 'kabinet',
    admin_route_group: null,
  });

  const password = input.password?.trim();
  if (password) {
    if (password.length < 6) {
      throw new Error('Parol kamida 6 belgidan iborat bo‘lishi kerak');
    }
    await updatePortalAuthPassword(profile.user_id, password);
  }

  const row: ReceptionUser = {
    id: input.id,
    shortName: input.fullName.trim(),
    roleName: roleLabel,
    department,
    username: login,
    lastAccess: '',
    email: input.email?.trim() || '',
    status: 'Актив',
    password: '',
    securityPin: '1111',
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function deleteReceptionStaffAccount(id: string): Promise<void> {
  const profile = await findReceptionProfileByExternalId(id);
  if (!profile) {
    await removeClinicJsonRow(id);
    return;
  }
  await deletePortalAuthUser(profile.user_id);
  await removeClinicJsonRow(id);
}
