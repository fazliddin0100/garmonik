import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { createPortalAuthUser } from '@/lib/auth/portal-session';
import {
  countStaffProfiles,
  findStaffProfileByExternalId,
  findStaffProfileByLogin,
  insertPortalProfile,
} from '@/lib/db/portal-profiles';
import { staffAuthEmail } from './auth-email';
import { INITIAL_STAFF_ACCOUNTS } from './initial-data';
import type { StaffAccount } from './types';

/** Demo parollar — `initial-data` dagi bcrypt bilan mos */
const DEMO_STAFF_PASSWORDS: Record<string, string> = {
  doctor: 'doctor123',
  laborant: 'lab123',
  hamshira: 'hamshira123',
  boshhamshira: 'hamshira123',
  kabinet: 'kabinet123',
};

function rowToAccount(r: {
  user_id: string;
  auth_email: string;
  staff_role: string | null;
  staff_login: string | null;
  display_name: string;
  legacy_external_id: string | null;
  department: string | null;
  is_active: boolean;
  created_at?: string;
}): StaffAccount {
  return {
    id: r.legacy_external_id || r.user_id,
    login: (r.staff_login || r.auth_email).toLowerCase(),
    passwordHash: '',
    fullName: r.display_name,
    role: (r.staff_role || 'shifokor') as StaffAccount['role'],
    department: r.department ?? '',
    isActive: r.is_active,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

/** Bo‘sh bo‘lsa demo xodimlar (app_users + profillar) */
export async function ensureStaffPortalSeed(): Promise<void> {
  const count = await countStaffProfiles();
  if (count > 0) return;

  const clinicId = await getDefaultClinicId();

  for (const a of INITIAL_STAFF_ACCOUNTS) {
    const email = staffAuthEmail(a.login);
    const password = DEMO_STAFF_PASSWORDS[a.login.toLowerCase()] ?? 'changeme123';
    try {
      const created = await createPortalAuthUser({ email, password });
      await insertPortalProfile({
        user_id: created.id,
        clinic_id: clinicId,
        account_kind: 'staff',
        auth_email: email,
        admin_route_group: null,
        staff_role: a.role,
        display_name: a.fullName,
        role_label: null,
        staff_login: a.login.trim().toLowerCase(),
        legacy_external_id: a.id,
        department: a.department ?? '',
        is_active: a.isActive,
      });
    } catch (error) {
      console.error('staff seed user', a.login, error);
    }
  }
}

export {
  listKadrlarEmployees as listStaffPortalAccounts,
  replaceKadrlarEmployees as replaceStaffPortalAccounts,
} from '@/lib/kadrlar/db-employees';

export async function findStaffByLoginNormalized(
  loginKey: string,
): Promise<StaffAccount | null> {
  const data = await findStaffProfileByLogin(loginKey);
  if (!data || !data.is_active) return null;
  return rowToAccount(data);
}

export async function findStaffByExternalId(
  externalId: string,
): Promise<StaffAccount | null> {
  const row = await findStaffProfileByExternalId(externalId);
  if (!row || !row.is_active) return null;
  return rowToAccount(row);
}
