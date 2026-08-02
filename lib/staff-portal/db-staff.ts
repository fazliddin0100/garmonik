import {
  findStaffProfileByExternalId,
  findStaffProfileByLogin,
} from '@/lib/db/portal-profiles';
import type { StaffAccount } from './types';

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

/** Demo seed o‘chirilgan — xodimlar faqat kadrlar/admin orqali yaratiladi */
export async function ensureStaffPortalSeed(): Promise<void> {
  return;
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
