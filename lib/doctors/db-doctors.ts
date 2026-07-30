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
  doctorToClinicJson,
  normalizeDoctorRow,
  type DoctorRow,
} from '@/lib/doctors/types';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { staffAuthEmail } from '@/lib/staff-portal/auth-email';

const DOCTOR_ROLES = new Set(['shifokor', 'doctor']);

const PROFILE_COLUMNS = `
  user_id, clinic_id, account_kind, auth_email, admin_route_group,
  staff_role, display_name, role_label, staff_login, legacy_external_id,
  department, is_active, phone, created_at
`;

export type DoctorStaffInput = {
  id?: string;
  fullName: string;
  specialty: string;
  department: string;
  contact?: string;
  code?: string;
  roomNumber?: string;
  degree?: string;
  position?: string;
  login: string;
  password?: string;
  isActive?: boolean;
};

function isDoctorRole(role: string | null | undefined): boolean {
  return DOCTOR_ROLES.has((role || '').trim().toLowerCase());
}

function statusFromActive(isActive: boolean): string {
  return isActive ? 'Актив' : 'Nofaol';
}

function rowFromProfile(
  r: PortalProfileRow,
  extras?: Partial<DoctorRow>,
): DoctorRow {
  const login = (r.staff_login || r.auth_email).toLowerCase();
  return {
    id: r.legacy_external_id || r.user_id,
    code: extras?.code?.trim() || '',
    fullName: r.display_name,
    roomNumber: extras?.roomNumber?.trim() || '',
    specialty: r.role_label?.trim() || extras?.specialty?.trim() || '',
    degree: extras?.degree?.trim() || '',
    department: r.department?.trim() || extras?.department?.trim() || '',
    position: extras?.position?.trim() || '',
    contact: r.phone?.trim() || extras?.contact?.trim() || '',
    status: statusFromActive(r.is_active),
    username: login,
    login,
  };
}

async function readClinicDoctorMap(): Promise<Map<string, DoctorRow>> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'doctors');
  const existing = Array.isArray(payload) ? payload : [];
  const map = new Map<string, DoctorRow>();
  for (const raw of existing) {
    const row = normalizeDoctorRow(raw);
    if (!row) continue;
    map.set(row.id, row);
    if (row.login) map.set(`login:${row.login}`, row);
  }
  return map;
}

async function syncClinicJsonRows(rows: DoctorRow[]): Promise<void> {
  const clinicId = await getDefaultClinicId();
  await upsertClinicResourcePayload(
    clinicId,
    'doctors',
    rows.map(doctorToClinicJson),
  );
}

async function syncClinicJsonRow(row: DoctorRow): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'doctors');
  const existing = Array.isArray(payload) ? payload : [];
  const normalized = existing
    .map(normalizeDoctorRow)
    .filter((x): x is DoctorRow => x !== null);
  const without = normalized.filter((p) => p.id !== row.id);
  await upsertClinicResourcePayload(clinicId, 'doctors', [
    doctorToClinicJson(row),
    ...without.map(doctorToClinicJson),
  ]);
}

async function removeClinicJsonRow(id: string): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'doctors');
  const existing = Array.isArray(payload) ? payload : [];
  const normalized = existing
    .map(normalizeDoctorRow)
    .filter((x): x is DoctorRow => x !== null && x.id !== id);
  await upsertClinicResourcePayload(
    clinicId,
    'doctors',
    normalized.map(doctorToClinicJson),
  );
}

async function nextDoctorCode(): Promise<string> {
  const clinicMap = await readClinicDoctorMap();
  const existing = [...clinicMap.values()].filter(
    (row, index, arr) => arr.findIndex((x) => x.id === row.id) === index,
  );
  const nums = existing
    .map((row) => Number.parseInt(row.code, 10))
    .filter((value) => Number.isFinite(value));
  const max = nums.length ? Math.max(...nums) : 0;
  return String(max + 1).padStart(3, '0');
}

/**
 * Clinic JSON dagi shifokorni login/legacy id bo‘yicha mavjud portal
 * shifokor bilan bog‘laydi (parolsiz yangi akkaunt yaratmaydi).
 */
async function linkLegacyClinicDoctors(): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const clinicMap = await readClinicDoctorMap();
  const clinicRows = [...clinicMap.values()].filter(
    (row, index, arr) => arr.findIndex((x) => x.id === row.id) === index,
  );

  for (const catalog of clinicRows) {
    if (!catalog.login) continue;
    try {
      const byLegacy = await findStaffProfileByExternalId(catalog.id);
      if (byLegacy && isDoctorRole(byLegacy.staff_role)) continue;

      const byLogin = await findPortalLoginByCredential(catalog.login);
      if (!byLogin || !isDoctorRole(byLogin.staff_role)) continue;
      if (byLogin.clinic_id !== clinicId) continue;

      await updatePortalProfile(clinicId, byLogin.user_id, {
        legacy_external_id: catalog.id,
        display_name: catalog.fullName || byLogin.display_name,
        role_label: catalog.specialty || byLogin.role_label || 'Shifokor',
        department: catalog.department || byLogin.department || '',
        phone: catalog.contact || byLogin.phone || null,
        staff_role: 'shifokor',
      });
    } catch (error) {
      console.error('doctors legacy link', catalog.login, error);
    }
  }
}

export async function listDoctorStaffAccounts(): Promise<DoctorRow[]> {
  await linkLegacyClinicDoctors();

  const clinicId = await getDefaultClinicId();
  const clinicMap = await readClinicDoctorMap();
  const result = await query<PortalProfileRow>(
    `select ${PROFILE_COLUMNS}
     from public.portal_user_profiles
     where clinic_id = $1
       and account_kind = 'staff'
       and staff_role in ('shifokor', 'doctor')
     order by display_name asc`,
    [clinicId],
  );

  const rows = result.rows.map((profile) => {
    const id = profile.legacy_external_id || profile.user_id;
    const login = (profile.staff_login || profile.auth_email).toLowerCase();
    const extras =
      clinicMap.get(id) ||
      clinicMap.get(`login:${login}`) ||
      undefined;
    return rowFromProfile(profile, extras);
  });

  await syncClinicJsonRows(rows);
  return rows;
}

export async function createDoctorStaffAccount(
  input: DoctorStaffInput,
): Promise<DoctorRow> {
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
  const isActive = input.isActive ?? true;
  const code = input.code?.trim() || (await nextDoctorCode());

  await insertPortalProfile({
    user_id: created.id,
    clinic_id: clinicId,
    account_kind: 'staff',
    auth_email: email,
    admin_route_group: null,
    staff_role: 'shifokor',
    display_name: input.fullName.trim(),
    role_label: input.specialty.trim() || 'Shifokor',
    staff_login: login,
    legacy_external_id: id,
    department: input.department.trim(),
    phone: input.contact?.trim() || null,
    is_active: isActive,
  });

  const row: DoctorRow = {
    id,
    code,
    fullName: input.fullName.trim(),
    roomNumber: input.roomNumber?.trim() || '',
    specialty: input.specialty.trim(),
    degree: input.degree?.trim() || '',
    department: input.department.trim(),
    position: input.position?.trim() || '',
    contact: input.contact?.trim() || '',
    status: statusFromActive(isActive),
    username: login,
    login,
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function updateDoctorStaffAccount(
  input: DoctorStaffInput & { id: string },
): Promise<DoctorRow> {
  const login = input.login.trim().toLowerCase();
  if (!input.fullName.trim() || !login) {
    throw new Error('F.I.SH va login majburiy');
  }

  const profile = await findStaffProfileByExternalId(input.id);
  if (!profile || !isDoctorRole(profile.staff_role)) {
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
  const clinicMap = await readClinicDoctorMap();
  const prev = clinicMap.get(input.id);
  const isActive = input.isActive ?? profile.is_active;

  await updatePortalProfile(clinicId, profile.user_id, {
    display_name: input.fullName.trim(),
    role_label: input.specialty.trim() || 'Shifokor',
    department: input.department.trim(),
    phone: input.contact?.trim() || null,
    staff_login: login,
    auth_email: staffAuthEmail(login),
    staff_role: 'shifokor',
    is_active: isActive,
  });

  const password = input.password?.trim();
  if (password) {
    if (password.length < 6) {
      throw new Error('Parol kamida 6 belgidan iborat bo‘lishi kerak');
    }
    await updatePortalAuthPassword(profile.user_id, password);
  }

  const row: DoctorRow = {
    id: input.id,
    code: input.code?.trim() || prev?.code || '',
    fullName: input.fullName.trim(),
    roomNumber: input.roomNumber?.trim() || prev?.roomNumber || '',
    specialty: input.specialty.trim(),
    degree: input.degree?.trim() || prev?.degree || '',
    department: input.department.trim(),
    position: input.position?.trim() || prev?.position || '',
    contact: input.contact?.trim() || '',
    status: statusFromActive(isActive),
    username: login,
    login,
  };
  await syncClinicJsonRow(row);
  return row;
}

export async function deleteDoctorStaffAccount(id: string): Promise<void> {
  const profile = await findStaffProfileByExternalId(id);
  if (profile && isDoctorRole(profile.staff_role)) {
    await deletePortalAuthUser(profile.user_id);
  }
  await removeClinicJsonRow(id);
}
