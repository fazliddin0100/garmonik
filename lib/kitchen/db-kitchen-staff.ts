import {
  createPortalAuthUser,
  deletePortalAuthUser,
  updatePortalAuthPassword,
} from '@/lib/auth/portal-session';
import {
  findPortalLoginByCredential,
  findStaffProfileByExternalId,
  insertPortalProfile,
  updatePortalProfile,
  type PortalProfileRow,
} from '@/lib/db/portal-profiles';
import { query } from '@/lib/db/query';
import {
  readClinicResourcePayload,
  upsertClinicResourcePayload,
} from '@/lib/db/clinic-json-resources';
import {
  kitchenStaffToClinicJson,
  normalizeKitchenStaffRow,
  type KitchenStaffRow,
} from '@/lib/kitchen/types';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { staffAuthEmail } from '@/lib/staff-portal/auth-email';

export type KitchenStaffInput = {
  id?: string;
  fullName: string;
  specialty?: string;
  department?: string;
  login: string;
  password?: string;
  isActive?: boolean;
};

function rowFromProfile(r: PortalProfileRow): KitchenStaffRow {
  return {
    id: r.legacy_external_id || r.user_id,
    fullName: r.display_name,
    specialty: r.role_label?.trim() || 'Oshpaz',
    department: r.department?.trim() || '',
    login: (r.staff_login || r.auth_email).toLowerCase(),
    isActive: r.is_active,
  };
}

async function syncClinicJsonRow(row: KitchenStaffRow): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'kitchen-staff');
  const existing = Array.isArray(payload) ? payload : [];
  const normalized = existing
    .map(normalizeKitchenStaffRow)
    .filter((x): x is KitchenStaffRow => x !== null);
  const without = normalized.filter((p) => p.id !== row.id);
  await upsertClinicResourcePayload(clinicId, 'kitchen-staff', [
    kitchenStaffToClinicJson(row),
    ...without.map(kitchenStaffToClinicJson),
  ]);
}

async function removeClinicJsonRow(id: string): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'kitchen-staff');
  const existing = Array.isArray(payload) ? payload : [];
  const normalized = existing
    .map(normalizeKitchenStaffRow)
    .filter((x): x is KitchenStaffRow => x !== null && x.id !== id);
  await upsertClinicResourcePayload(
    clinicId,
    'kitchen-staff',
    normalized.map(kitchenStaffToClinicJson),
  );
}

export async function listKitchenStaffAccounts(): Promise<KitchenStaffRow[]> {
  const clinicId = await getDefaultClinicId();
  const result = await query<PortalProfileRow>(
    `select user_id, clinic_id, account_kind, auth_email, admin_route_group,
            staff_role, display_name, role_label, staff_login, legacy_external_id,
            department, is_active, created_at
     from public.portal_user_profiles
     where clinic_id = $1
       and account_kind = 'staff'
       and staff_role = 'oshpaz'
     order by display_name asc`,
    [clinicId],
  );
  return result.rows.map(rowFromProfile);
}

export async function createKitchenStaffAccount(
  input: KitchenStaffInput,
): Promise<KitchenStaffRow> {
  const login = input.login.trim().toLowerCase();
  const password = input.password?.trim() ?? '';
  if (!input.fullName.trim() || !login) {
    throw new Error('F.I.SH va login majburiy');
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

  await insertPortalProfile({
    user_id: created.id,
    clinic_id: clinicId,
    account_kind: 'staff',
    auth_email: email,
    admin_route_group: null,
    staff_role: 'oshpaz',
    display_name: input.fullName.trim(),
    role_label: (input.specialty ?? '').trim() || 'Oshpaz',
    staff_login: login,
    legacy_external_id: id,
    department: (input.department ?? '').trim(),
    is_active: input.isActive ?? true,
  });

  const row: KitchenStaffRow = {
    id,
    fullName: input.fullName.trim(),
    specialty: (input.specialty ?? '').trim() || 'Oshpaz',
    department: (input.department ?? '').trim(),
    login,
    isActive: input.isActive ?? true,
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function updateKitchenStaffAccount(
  input: KitchenStaffInput & { id: string },
): Promise<KitchenStaffRow> {
  const login = input.login.trim().toLowerCase();
  if (!input.fullName.trim() || !login) {
    throw new Error('F.I.SH va login majburiy');
  }

  const profile = await findStaffProfileByExternalId(input.id);
  if (!profile || profile.staff_role !== 'oshpaz') {
    throw new Error('Xodim topilmadi');
  }

  const currentLogin = (profile.staff_login || profile.auth_email).toLowerCase();
  if (login !== currentLogin) {
    const taken = await findPortalLoginByCredential(login);
    if (taken && taken.user_id !== profile.user_id) {
      throw new Error('Bu login band');
    }
  }

  const clinicId = await getDefaultClinicId();
  await updatePortalProfile(clinicId, profile.user_id, {
    display_name: input.fullName.trim(),
    role_label: (input.specialty ?? '').trim() || 'Oshpaz',
    department: (input.department ?? '').trim(),
    staff_login: login,
    auth_email: staffAuthEmail(login),
    is_active: input.isActive ?? true,
  });

  const password = input.password?.trim();
  if (password) {
    if (password.length < 6) {
      throw new Error('Parol kamida 6 belgidan iborat bo‘lishi kerak');
    }
    await updatePortalAuthPassword(profile.user_id, password);
  }

  const row: KitchenStaffRow = {
    id: input.id,
    fullName: input.fullName.trim(),
    specialty: (input.specialty ?? '').trim() || 'Oshpaz',
    department: (input.department ?? '').trim(),
    login,
    isActive: input.isActive ?? true,
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function deleteKitchenStaffAccount(id: string): Promise<void> {
  const profile = await findStaffProfileByExternalId(id);
  if (profile?.staff_role === 'oshpaz') {
    await deletePortalAuthUser(profile.user_id);
  }
  await removeClinicJsonRow(id);
}
