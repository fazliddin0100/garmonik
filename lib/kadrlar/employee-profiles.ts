import type { ClinicResourceKey } from '@/lib/clinic-data/keys';
import { parseBirthInputToIso } from '@/lib/patients/birth-display';
import {
  birthYearFromAge,
  profileLookupKey,
  splitFullName,
  type KadrlarStaffKind,
} from '@/lib/kadrlar/staff-kind';
import {
  readClinicResource,
  writeClinicResource,
} from '@/lib/server/clinic-resource-service';

const STORAGE_KEY = 'kadrlar-employee-profiles' satisfies ClinicResourceKey;

export type KadrlarEmployeeProfile = {
  employeeId: string;
  staffKind: KadrlarStaffKind;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthYear: number | null;
  activityDirection: string;
  address: string;
  objektivkaPath: string;
  objektivkaFileName: string;
  updatedAt: string;
};

export type KadrlarEmployeeProfileInput = {
  employeeId: string;
  staffKind: KadrlarStaffKind;
  firstName: string;
  lastName: string;
  birthDate: string;
  activityDirection: string;
  address: string;
};

export type KadrlarEnrichedEmployee = {
  id: string;
  staffKind: KadrlarStaffKind;
  firstName: string;
  lastName: string;
  fullName: string;
  birthDate: string;
  birthYear: number | null;
  activityDirection: string;
  address: string;
  position: string;
  login: string;
  departmentRaw: string;
  roleKey: string;
  objektivkaPath: string;
  objektivkaFileName: string;
};

function parseBirthYearValue(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const num = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10);
  if (!Number.isFinite(num) || num < 1900 || num > 2100) return null;
  return Math.floor(num);
}

function parseBirthDateValue(raw: unknown, birthYear: number | null): string {
  const iso = parseBirthInputToIso(typeof raw === 'string' ? raw : '');
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  if (birthYear !== null) return `${birthYear}-01-01`;
  return '';
}

function birthYearFromDate(birthDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const year = Number.parseInt(birthDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function normalizeProfile(raw: unknown): KadrlarEmployeeProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const employeeId =
    typeof row.employeeId === 'string' ? row.employeeId.trim() : '';
  const staffKind =
    typeof row.staffKind === 'string' ? row.staffKind.trim() : '';
  if (!employeeId || !staffKind) return null;

  const birthYear = parseBirthYearValue(row.birthYear);
  const birthDate = parseBirthDateValue(row.birthDate, birthYear);

  return {
    employeeId,
    staffKind: staffKind as KadrlarStaffKind,
    firstName: typeof row.firstName === 'string' ? row.firstName.trim() : '',
    lastName: typeof row.lastName === 'string' ? row.lastName.trim() : '',
    birthDate,
    birthYear: birthYear ?? birthYearFromDate(birthDate),
    activityDirection:
      typeof row.activityDirection === 'string' ?
        row.activityDirection.trim()
      : '',
    address: typeof row.address === 'string' ? row.address.trim() : '',
    objektivkaPath:
      typeof row.objektivkaPath === 'string' ? row.objektivkaPath.trim() : '',
    objektivkaFileName:
      typeof row.objektivkaFileName === 'string' ?
        row.objektivkaFileName.trim()
      : '',
    updatedAt:
      typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
  };
}

export async function listEmployeeProfiles(): Promise<KadrlarEmployeeProfile[]> {
  const raw = await readClinicResource(STORAGE_KEY);
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeProfile)
    .filter((row): row is KadrlarEmployeeProfile => row !== null);
}

export async function getEmployeeProfile(
  employeeId: string,
  staffKind: KadrlarStaffKind,
): Promise<KadrlarEmployeeProfile | null> {
  const all = await listEmployeeProfiles();
  return (
    all.find(
      (row) =>
        row.employeeId === employeeId.trim() &&
        row.staffKind === staffKind,
    ) ?? null
  );
}

export async function upsertEmployeeProfile(
  input: KadrlarEmployeeProfileInput,
): Promise<KadrlarEmployeeProfile> {
  const all = await listEmployeeProfiles();
  const employeeId = input.employeeId.trim();
  const idx = all.findIndex(
    (row) => row.employeeId === employeeId && row.staffKind === input.staffKind,
  );
  const prev = idx >= 0 ? all[idx] : null;

  const birthDate = parseBirthDateValue(input.birthDate, null);
  const birthYear = birthYearFromDate(birthDate);

  const next: KadrlarEmployeeProfile = {
    employeeId,
    staffKind: input.staffKind,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    birthDate,
    birthYear,
    activityDirection: input.activityDirection.trim(),
    address: input.address.trim(),
    objektivkaPath: prev?.objektivkaPath ?? '',
    objektivkaFileName: prev?.objektivkaFileName ?? '',
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) all[idx] = next;
  else all.push(next);

  await writeClinicResource(STORAGE_KEY, all);
  return next;
}

export async function setEmployeeObjektivka(
  employeeId: string,
  staffKind: KadrlarStaffKind,
  objektivkaPath: string,
  objektivkaFileName: string,
): Promise<KadrlarEmployeeProfile> {
  const all = await listEmployeeProfiles();
  const id = employeeId.trim();
  const idx = all.findIndex(
    (row) => row.employeeId === id && row.staffKind === staffKind,
  );

  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      objektivkaPath: objektivkaPath.trim(),
      objektivkaFileName: objektivkaFileName.trim(),
      updatedAt: new Date().toISOString(),
    };
    await writeClinicResource(STORAGE_KEY, all);
    return all[idx];
  }

  const { firstName, lastName } = splitFullName('');
  const created: KadrlarEmployeeProfile = {
    employeeId: id,
    staffKind,
    firstName,
    lastName,
    birthDate: '',
    birthYear: null,
    activityDirection: '',
    address: '',
    objektivkaPath: objektivkaPath.trim(),
    objektivkaFileName: objektivkaFileName.trim(),
    updatedAt: new Date().toISOString(),
  };
  all.push(created);
  await writeClinicResource(STORAGE_KEY, all);
  return created;
}

export function buildProfileMap(
  profiles: KadrlarEmployeeProfile[],
): Map<string, KadrlarEmployeeProfile> {
  const map = new Map<string, KadrlarEmployeeProfile>();
  for (const profile of profiles) {
    map.set(profileLookupKey(profile.staffKind, profile.employeeId), profile);
  }
  return map;
}

type BaseDepartmentUser = {
  id: string;
  staffKind: KadrlarStaffKind;
  fullName: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthYear?: number | null;
  activityDirection?: string;
  address?: string;
  position: string;
  login: string;
  departmentRaw: string;
  roleKey: string;
};

export function enrichDepartmentUser<T extends BaseDepartmentUser>(
  user: T,
  profileMap: Map<string, KadrlarEmployeeProfile>,
): KadrlarEnrichedEmployee {
  const profile =
    profileMap.get(profileLookupKey(user.staffKind, user.id)) ?? null;

  const parsed = splitFullName(user.fullName);
  const baseFirst = user.firstName?.trim() || parsed.firstName;
  const baseLast = user.lastName?.trim() || parsed.lastName;
  const baseBirthYear =
    user.birthYear !== undefined ? user.birthYear : null;
  const baseBirthDate =
    user.birthDate?.trim() ||
    (baseBirthYear !== null ? `${baseBirthYear}-01-01` : '');

  if (profile) {
    const birthDate = profile.birthDate || baseBirthDate;
    const firstName = profile.firstName || baseFirst;
    const lastName = profile.lastName || baseLast;
    const fullName =
      [firstName, lastName].filter(Boolean).join(' ').trim() || user.fullName;

    return {
      id: user.id,
      staffKind: user.staffKind,
      firstName,
      lastName,
      fullName,
      birthDate,
      birthYear: profile.birthYear ?? birthYearFromDate(birthDate) ?? baseBirthYear,
      activityDirection:
        profile.activityDirection || user.activityDirection?.trim() || '',
      address: profile.address || user.address?.trim() || '',
      position: user.position,
      login: user.login,
      departmentRaw: user.departmentRaw,
      roleKey: user.roleKey,
      objektivkaPath: profile.objektivkaPath,
      objektivkaFileName: profile.objektivkaFileName,
    };
  }

  const fullName =
    [baseFirst, baseLast].filter(Boolean).join(' ').trim() || user.fullName;

  return {
    id: user.id,
    staffKind: user.staffKind,
    firstName: baseFirst,
    lastName: baseLast,
    fullName,
    birthDate: baseBirthDate,
    birthYear: baseBirthYear,
    activityDirection: user.activityDirection?.trim() || '',
    address: user.address?.trim() || '',
    position: user.position,
    login: user.login,
    departmentRaw: user.departmentRaw,
    roleKey: user.roleKey,
    objektivkaPath: '',
    objektivkaFileName: '',
  };
}

export { birthYearFromAge, splitFullName };
