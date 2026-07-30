import {
  adminRoleLabelToJwtRouteGroup,
  isAdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import {
  isKadrlarManagedAdminRouteGroup,
} from '@/lib/kadrlar/roles';
import { staffAuthEmail } from '@/lib/staff-portal/auth-email';
import { isStaffRole, type StaffRole } from '@/lib/staff-portal/types';
import { parseNarrowSpecialistIdFromDepartment } from '@/lib/patients/specialist-staff';
import { query, queryOne } from './query';

export type PortalProfileRow = {
  user_id: string;
  clinic_id: string;
  account_kind: 'admin' | 'staff';
  auth_email: string;
  admin_route_group: string | null;
  staff_role: string | null;
  display_name: string;
  role_label: string | null;
  staff_login: string | null;
  legacy_external_id: string | null;
  department: string | null;
  is_active: boolean;
  first_name?: string | null;
  last_name?: string | null;
  father_name?: string | null;
  age?: number | null;
  phone?: string | null;
  created_at?: string;
};

const PROFILE_COLUMNS = `
  user_id, clinic_id, account_kind, auth_email, admin_route_group,
  staff_role, display_name, role_label, staff_login, legacy_external_id,
  department, is_active, first_name, last_name, father_name, age, phone, created_at
`;

function mapProfile(row: PortalProfileRow | null): PortalProfileRow | null {
  return row;
}

export async function fetchPortalProfileByUserId(
  userId: string,
): Promise<PortalProfileRow | null> {
  return mapProfile(
    await queryOne<PortalProfileRow>(
      `select ${PROFILE_COLUMNS}
       from public.portal_user_profiles
       where user_id = $1
       limit 1`,
      [userId],
    ),
  );
}

export async function findAdminProfileByLogin(
  loginNorm: string,
): Promise<PortalProfileRow | null> {
  const byEmail = await queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'admin' and lower(auth_email) = lower($1)
     limit 1`,
    [loginNorm],
  );
  if (byEmail) return byEmail;

  return queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'admin' and lower(staff_login) = lower($1)
     limit 1`,
    [loginNorm],
  );
}

function isAllowedPortalLogin(row: PortalProfileRow): boolean {
  if (!row.is_active) return false;
  if (row.account_kind === 'staff') {
    return isStaffRole(row.staff_role || '');
  }
  if (row.account_kind === 'admin') {
    if (!row.legacy_external_id) return false;
    return isKadrlarManagedAdminRouteGroup(row.admin_route_group);
  }
  return false;
}

export async function findPortalLoginByCredential(
  loginNorm: string,
): Promise<PortalProfileRow | null> {
  const email = staffAuthEmail(loginNorm);

  const byLogin = await queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where lower(staff_login) = lower($1)
     limit 1`,
    [loginNorm],
  );
  if (byLogin && isAllowedPortalLogin(byLogin)) return byLogin;

  const byEmail = await queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where lower(auth_email) = lower($1)
     limit 1`,
    [email],
  );
  if (byEmail && isAllowedPortalLogin(byEmail)) return byEmail;

  const byRaw = await queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where lower(auth_email) = lower($1)
     limit 1`,
    [loginNorm],
  );
  if (byRaw && isAllowedPortalLogin(byRaw)) return byRaw;

  return null;
}

export async function updateProfileLastLogin(userId: string): Promise<void> {
  await query(
    `update public.portal_user_profiles
     set last_login_at = now(), updated_at = now()
     where user_id = $1`,
    [userId],
  );
}

export async function countStaffProfiles(): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `select count(*)::text as n
     from public.portal_user_profiles
     where account_kind = 'staff'`,
  );
  return Number.parseInt(row?.n ?? '0', 10);
}

export async function insertPortalProfile(
  profile: Record<string, unknown>,
): Promise<void> {
  const keys = Object.keys(profile);
  const values = Object.values(profile);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  await query(
    `insert into public.portal_user_profiles (${keys.join(', ')})
     values (${placeholders})`,
    values,
  );
}

export async function updatePortalProfile(
  clinicId: string,
  userId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
  await query(
    `update public.portal_user_profiles
     set ${sets}, updated_at = now()
     where clinic_id = $1 and user_id = $2`,
    [clinicId, userId, ...Object.values(patch)],
  );
}

export async function listProfilesByClinic(
  clinicId: string,
): Promise<PortalProfileRow[]> {
  const result = await query<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where clinic_id = $1
     order by created_at desc nulls last`,
    [clinicId],
  );
  return result.rows;
}

export async function findProfileInClinic(
  clinicId: string,
  userId: string,
  accountKind?: 'admin' | 'staff',
): Promise<PortalProfileRow | null> {
  if (accountKind) {
    return queryOne<PortalProfileRow>(
      `select ${PROFILE_COLUMNS}
       from public.portal_user_profiles
       where clinic_id = $1 and user_id = $2 and account_kind = $3
       limit 1`,
      [clinicId, userId, accountKind],
    );
  }
  return queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where clinic_id = $1 and user_id = $2
     limit 1`,
    [clinicId, userId],
  );
}

export async function adminLoginExists(
  loginNorm: string,
  emailNorm: string,
): Promise<boolean> {
  const row = await queryOne<{ n: string }>(
    `select count(*)::text as n
     from public.portal_user_profiles
     where account_kind = 'admin'
       and (lower(staff_login) = lower($1) or lower(auth_email) = lower($2))`,
    [loginNorm, emailNorm],
  );
  return Number.parseInt(row?.n ?? '0', 10) > 0;
}

export async function listKadrlarManagedProfileUserIds(): Promise<
  { user_id: string; account_kind: string; legacy_external_id: string | null; admin_route_group: string | null }[]
> {
  const result = await query<{
    user_id: string;
    account_kind: string;
    legacy_external_id: string | null;
    admin_route_group: string | null;
  }>(
    `select user_id, account_kind, legacy_external_id, admin_route_group
     from public.portal_user_profiles`,
  );
  return result.rows;
}

export async function listStaffProfileRows(): Promise<PortalProfileRow[]> {
  const result = await query<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'staff'
     order by created_at desc`,
  );
  return result.rows;
}

export async function listKadrlarAdminProfileRows(): Promise<PortalProfileRow[]> {
  const result = await query<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'admin'
       and legacy_external_id is not null
     order by created_at desc`,
  );
  return result.rows;
}

export async function findStaffProfileByLogin(
  loginKey: string,
): Promise<PortalProfileRow | null> {
  return queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'staff' and lower(staff_login) = lower($1)
     limit 1`,
    [loginKey],
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function findStaffProfileByExternalId(
  externalId: string,
): Promise<PortalProfileRow | null> {
  const byLegacy = await queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'staff' and legacy_external_id = $1
     limit 1`,
    [externalId],
  );
  if (byLegacy) return byLegacy;

  if (!UUID_RE.test(externalId)) return null;

  return queryOne<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where account_kind = 'staff' and user_id = $1
     limit 1`,
    [externalId],
  );
}

export async function findActiveDoctorInClinic(
  clinicId: string,
  userId: string,
): Promise<{ user_id: string; display_name: string } | null> {
  return queryOne<{ user_id: string; display_name: string }>(
    `select user_id, display_name from public.portal_user_profiles
     where clinic_id = $1
       and account_kind = 'staff'
       and is_active = true
       and staff_role in ('shifokor', 'doctor')
       and user_id = $2
     limit 1`,
    [clinicId, userId],
  );
}

export async function listDoctorsInClinic(clinicId: string): Promise<
  {
    user_id: string;
    display_name: string;
    department: string | null;
    staff_role: string | null;
  }[]
> {
  const result = await query<{
    user_id: string;
    display_name: string;
    department: string | null;
    staff_role: string | null;
  }>(
    `select user_id, display_name, department, staff_role
     from public.portal_user_profiles
     where clinic_id = $1
       and account_kind = 'staff'
       and is_active = true
       and staff_role in ('shifokor', 'doctor')
     order by display_name asc`,
    [clinicId],
  );
  return result.rows;
}

export async function listAdminLoginMeta(clinicId: string): Promise<
  { staff_login: string | null; auth_email: string; last_login_at: string | null }[]
> {
  const result = await query<{
    staff_login: string | null;
    auth_email: string;
    last_login_at: string | null;
  }>(
    `select staff_login, auth_email, last_login_at
     from public.portal_user_profiles
     where clinic_id = $1 and account_kind = 'admin'`,
    [clinicId],
  );
  return result.rows;
}

export async function fetchProfileClinicId(
  userId: string,
): Promise<string | null> {
  const row = await queryOne<{ clinic_id: string }>(
    `select clinic_id from public.portal_user_profiles where user_id = $1 limit 1`,
    [userId],
  );
  return row?.clinic_id ?? null;
}

export async function findUserForPasswordReset(
  loginNorm: string,
  accountKind: 'admin' | 'staff',
): Promise<{ userId: string; clinicId: string } | null> {
  if (accountKind === 'admin') {
    const profile = await findAdminProfileByLogin(loginNorm);
    if (profile) {
      return { userId: profile.user_id, clinicId: profile.clinic_id };
    }
    return null;
  }

  const byLogin = await queryOne<{ user_id: string; clinic_id: string }>(
    `select user_id, clinic_id
     from public.portal_user_profiles
     where account_kind = 'staff' and lower(staff_login) = lower($1)
     limit 1`,
    [loginNorm],
  );
  if (byLogin) return { userId: byLogin.user_id, clinicId: byLogin.clinic_id };

  const byEmail = await queryOne<{ user_id: string; clinic_id: string }>(
    `select user_id, clinic_id
     from public.portal_user_profiles
     where account_kind = 'staff' and lower(auth_email) = lower($1)
     limit 1`,
    [staffAuthEmail(loginNorm)],
  );
  if (byEmail) return { userId: byEmail.user_id, clinicId: byEmail.clinic_id };

  const byRaw = await queryOne<{ user_id: string; clinic_id: string }>(
    `select user_id, clinic_id
     from public.portal_user_profiles
     where account_kind = 'staff' and lower(auth_email) = lower($1)
     limit 1`,
    [loginNorm],
  );
  if (byRaw) return { userId: byRaw.user_id, clinicId: byRaw.clinic_id };
  return null;
}

export function profileToVerifiedSession(
  profile: PortalProfileRow,
): import('@/lib/auth/session-jwt').VerifiedSession | null {
  if (!profile.is_active) return null;

  if (profile.account_kind === 'admin') {
    const fallback = adminRoleLabelToJwtRouteGroup(
      profile.role_label,
      profile.staff_login || profile.auth_email,
    );
    const routeGroup =
      profile.admin_route_group && isAdminJwtRouteGroup(profile.admin_route_group) ?
        profile.admin_route_group
      : fallback;

    return {
      kind: 'admin',
      id: profile.user_id,
      clinicId: profile.clinic_id,
      routeGroup,
      login: profile.staff_login || profile.auth_email,
      displayName:
        profile.display_name?.trim() ?
          profile.display_name.trim()
        : profile.auth_email,
      roleLabel: profile.role_label?.trim() || '',
    };
  }

  const sr = profile.staff_role || '';
  if (!isStaffRole(sr)) return null;

  const narrowSpecialistId =
    sr === 'specialist' ?
      parseNarrowSpecialistIdFromDepartment(profile.department) ?? undefined
    : undefined;

  return {
    kind: 'staff',
    id: profile.user_id,
    clinicId: profile.clinic_id,
    role: sr as StaffRole,
    login: profile.staff_login || profile.auth_email,
    fullName: profile.display_name || profile.auth_email,
    ...(narrowSpecialistId ? { narrowSpecialistId } : {}),
  };
}
