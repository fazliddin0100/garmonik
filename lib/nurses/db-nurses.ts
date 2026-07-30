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
  normalizeNurseRow,
  normalizeNurseStaffRole,
  nurseStaffRoleLabel,
  nurseToClinicJson,
  type NurseRow,
  type NurseStaffRole,
} from '@/lib/nurses/types';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { staffAuthEmail } from '@/lib/staff-portal/auth-email';

const NURSE_ROLES = new Set(['nurse', 'head_nurse']);

export type NurseStaffInput = {
  id?: string;
  fullName: string;
  specialty: string;
  department: string;
  contact: string;
  login: string;
  password?: string;
  isActive?: boolean;
  staffRole?: NurseStaffRole;
};

function isNurseRole(role: string | null | undefined): boolean {
  return NURSE_ROLES.has((role || '').trim().toLowerCase());
}

function rowFromProfile(r: PortalProfileRow): NurseRow {
  const staffRole = normalizeNurseStaffRole(r.staff_role);
  return {
    id: r.legacy_external_id || r.user_id,
    fullName: r.display_name,
    specialty: r.role_label?.trim() || '',
    department: r.department?.trim() || '',
    contact: r.phone?.trim() || '',
    login: (r.staff_login || r.auth_email).toLowerCase(),
    isActive: r.is_active,
    staffRole,
  };
}

async function syncClinicJsonRow(row: NurseRow): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'nurses');
  const existing = Array.isArray(payload) ? payload : [];
  const normalized = existing
    .map(normalizeNurseRow)
    .filter((x): x is NurseRow => x !== null);
  const without = normalized.filter((p) => p.id !== row.id);
  await upsertClinicResourcePayload(clinicId, 'nurses', [
    nurseToClinicJson(row),
    ...without.map(nurseToClinicJson),
  ]);
}

async function removeClinicJsonRow(id: string): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'nurses');
  const existing = Array.isArray(payload) ? payload : [];
  const normalized = existing
    .map(normalizeNurseRow)
    .filter((x): x is NurseRow => x !== null && x.id !== id);
  await upsertClinicResourcePayload(
    clinicId,
    'nurses',
    normalized.map(nurseToClinicJson),
  );
}

export async function listNurseStaffAccounts(): Promise<NurseRow[]> {
  const clinicId = await getDefaultClinicId();
  const result = await query<PortalProfileRow>(
    `select user_id, clinic_id, account_kind, auth_email, admin_route_group,
            staff_role, display_name, role_label, staff_login, legacy_external_id,
            department, is_active, phone, created_at
     from public.portal_user_profiles
     where clinic_id = $1
       and account_kind = 'staff'
       and staff_role in ('nurse', 'head_nurse')
     order by display_name asc`,
    [clinicId],
  );
  return result.rows.map(rowFromProfile);
}

export async function createNurseStaffAccount(input: NurseStaffInput): Promise<NurseRow> {
  const login = input.login.trim().toLowerCase();
  const password = input.password?.trim() ?? '';
  const staffRole = normalizeNurseStaffRole(input.staffRole);
  if (!input.fullName.trim() || !login) {
    throw new Error('F.I.SH va login majburiy');
  }
  if (password.length < 6) {
    throw new Error('Parol kamida 6 belgidan iborat bo‘lishi kerak');
  }

  const taken = await findPortalLoginByCredential(login);
  if (taken) throw new Error('Bu login band');

  const clinicId = await getDefaultClinicId();
  const id = crypto.randomUUID();
  const email = staffAuthEmail(login);
  const created = await createPortalAuthUser({ email, password });
  const defaultSpecialty = nurseStaffRoleLabel(staffRole);

  await insertPortalProfile({
    user_id: created.id,
    clinic_id: clinicId,
    account_kind: 'staff',
    auth_email: email,
    admin_route_group: null,
    staff_role: staffRole,
    display_name: input.fullName.trim(),
    role_label: input.specialty.trim() || defaultSpecialty,
    staff_login: login,
    legacy_external_id: id,
    department: input.department.trim(),
    phone: input.contact.trim(),
    is_active: input.isActive ?? true,
  });

  const row: NurseRow = {
    id,
    fullName: input.fullName.trim(),
    specialty: input.specialty.trim(),
    department: input.department.trim(),
    contact: input.contact.trim(),
    login,
    isActive: input.isActive ?? true,
    staffRole,
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function updateNurseStaffAccount(
  input: NurseStaffInput & { id: string },
): Promise<NurseRow> {
  const login = input.login.trim().toLowerCase();
  const staffRole = normalizeNurseStaffRole(input.staffRole);
  if (!input.fullName.trim() || !login) {
    throw new Error('F.I.SH va login majburiy');
  }

  const profile = await findStaffProfileByExternalId(input.id);
  if (!profile || !isNurseRole(profile.staff_role)) {
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
  const defaultSpecialty = nurseStaffRoleLabel(staffRole);
  await updatePortalProfile(clinicId, profile.user_id, {
    display_name: input.fullName.trim(),
    role_label: input.specialty.trim() || defaultSpecialty,
    department: input.department.trim(),
    phone: input.contact.trim(),
    staff_login: login,
    auth_email: staffAuthEmail(login),
    staff_role: staffRole,
    is_active: input.isActive ?? true,
  });

  const password = input.password?.trim();
  if (password) {
    if (password.length < 6) {
      throw new Error('Parol kamida 6 belgidan iborat bo‘lishi kerak');
    }
    await updatePortalAuthPassword(profile.user_id, password);
  }

  const row: NurseRow = {
    id: input.id,
    fullName: input.fullName.trim(),
    specialty: input.specialty.trim(),
    department: input.department.trim(),
    contact: input.contact.trim(),
    login,
    isActive: input.isActive ?? true,
    staffRole,
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function deleteNurseStaffAccount(id: string): Promise<void> {
  const profile = await findStaffProfileByExternalId(id);
  if (profile && isNurseRole(profile.staff_role)) {
    await deletePortalAuthUser(profile.user_id);
  }
  await removeClinicJsonRow(id);
}
