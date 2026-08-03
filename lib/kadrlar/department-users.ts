import { adminDisplayName, type AdminUser } from '@/lib/admins/types';
import {
  findDepartmentById,
  normalizeDepartmentGroups,
  resolveDepartmentDisplay,
} from '@/lib/clinic-departments/roles';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';
import { adminRoleLabelToJwtRouteGroup } from '@/lib/admins/portal-routes';
import {
  birthYearFromAge,
  buildProfileMap,
  enrichDepartmentUser,
  listEmployeeProfiles,
  type KadrlarEnrichedEmployee,
} from '@/lib/kadrlar/employee-profiles';
import {
  kadrlarStaffKindFromRoleKey,
  splitFullName,
} from '@/lib/kadrlar/staff-kind';
import {
  kadrlarRoleKeyFromAdminProfile,
  normalizeKadrlarRoleKey,
} from '@/lib/kadrlar/roles';
import { readClinicResource } from '@/lib/server/clinic-resource-service';
import { listDoctorStaffAccounts } from '@/lib/doctors/db-doctors';
import { listLaboratoryStaffAccounts } from '@/lib/laboratory-staff/db-lab-staff';
import { listKitchenStaffAccounts } from '@/lib/kitchen/db-kitchen-staff';
import { listNurseStaffAccounts } from '@/lib/nurses/db-nurses';
import { listPharmacistStaffAccounts } from '@/lib/pharmacists/db-pharmacists';
import { listReceptionStaffAccounts } from '@/lib/reception/db-reception-staff';

export type KadrlarDepartmentUser = KadrlarEnrichedEmployee;

type RawDepartmentUser = Omit<
  KadrlarEnrichedEmployee,
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'birthDate'
  | 'birthYear'
  | 'activityDirection'
  | 'address'
  | 'objektivkaPath'
  | 'objektivkaFileName'
> & {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthYear?: number | null;
  activityDirection?: string;
  address?: string;
  fullName: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function roleKeyFromAdminRow(row: AdminUser): string {
  return kadrlarRoleKeyFromAdminProfile({
    role_label: row.roleName,
    admin_route_group: adminRoleLabelToJwtRouteGroup(row.roleName, row.username),
  });
}

function pushUser(target: RawDepartmentUser[], user: RawDepartmentUser) {
  const loginKey = user.login.trim().toLowerCase();
  if (
    target.some(
      (row) =>
        row.id === user.id ||
        (loginKey && row.login.toLowerCase() === loginKey),
    )
  ) {
    return;
  }
  target.push(user);
}

export async function listAllKadrlarDepartmentUsers(): Promise<{
  users: RawDepartmentUser[];
  departments: DepartmentGroup[];
}> {
  const [
    adminsRaw,
    doctorsRaw,
    nurses,
    laboratory,
    receptionRaw,
    pharmacistsRaw,
    kitchenRaw,
    departmentsRaw,
  ] = await Promise.all([
    readClinicResource('admins'),
    listDoctorStaffAccounts(),
    listNurseStaffAccounts(),
    listLaboratoryStaffAccounts(),
    listReceptionStaffAccounts(),
    listPharmacistStaffAccounts(),
    listKitchenStaffAccounts(),
    readClinicResource('departments'),
  ]);

  const departments = normalizeDepartmentGroups(departmentsRaw);
  const users: RawDepartmentUser[] = [];

  for (const item of asArray<unknown>(adminsRaw)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== 'string' || !row.id.trim()) continue;
    if (typeof row.username !== 'string' || !row.username.trim()) continue;

    let firstName = typeof row.firstName === 'string' ? row.firstName.trim() : '';
    let lastName = typeof row.lastName === 'string' ? row.lastName.trim() : '';
    const legacyShort = typeof row.shortName === 'string' ? row.shortName.trim() : '';
    if (!firstName && !lastName && legacyShort) {
      const bits = legacyShort.split(/\s+/).filter(Boolean);
      firstName = bits[0] ?? '';
      lastName = bits.slice(1).join(' ');
    }
    if (!firstName && !lastName) continue;

    const admin: AdminUser = {
      id: row.id.trim(),
      firstName,
      lastName,
      fatherName: typeof row.fatherName === 'string' ? row.fatherName.trim() : '—',
      age: typeof row.age === 'number' ? row.age : 0,
      roleName: typeof row.roleName === 'string' ? row.roleName.trim() : 'Administrator',
      username: row.username.trim(),
      phone: typeof row.phone === 'string' ? row.phone : '',
      password: typeof row.password === 'string' ? row.password : '',
      securityPin: typeof row.securityPin === 'string' ? row.securityPin : '',
    };

    const roleKey = roleKeyFromAdminRow(admin);
    const departmentRaw =
      typeof row.department === 'string' ? row.department.trim()
      : typeof row.departmentId === 'string' ? row.departmentId.trim()
      : '';

    pushUser(users, {
      id: admin.id,
      staffKind: kadrlarStaffKindFromRoleKey(roleKey, 'admin'),
      fullName: adminDisplayName(admin),
      firstName: admin.firstName,
      lastName: admin.lastName,
      birthYear: birthYearFromAge(admin.age),
      activityDirection: admin.roleName || '',
      position: admin.roleName || 'Administrator',
      login: admin.username,
      departmentRaw,
      roleKey,
    });
  }

  for (const row of doctorsRaw.filter((item) => item.fullName?.trim())) {
    const departmentRaw = row.department.trim();
    const roleKey = 'shifokor';
    pushUser(users, {
      id: row.id,
      staffKind: kadrlarStaffKindFromRoleKey(roleKey),
      fullName: row.fullName.trim(),
      activityDirection:
        row.specialty.trim() || row.position.trim() || 'Shifokor',
      position: row.specialty.trim() || row.position.trim() || 'Shifokor',
      login: row.login.trim() || row.username.trim(),
      departmentRaw,
      roleKey,
    });
  }

  for (const row of nurses.filter((item) => item.fullName.trim())) {
    const roleKey = row.staffRole === 'head_nurse' ? 'head_nurse' : 'nurse';
    pushUser(users, {
      id: row.id,
      staffKind: kadrlarStaffKindFromRoleKey(roleKey),
      fullName: row.fullName.trim(),
      activityDirection:
        row.specialty.trim() ||
        (row.staffRole === 'head_nurse' ? 'Bosh hamshira' : 'Hamshira'),
      position:
        row.specialty.trim() ||
        (row.staffRole === 'head_nurse' ? 'Bosh hamshira' : 'Hamshira'),
      login: row.login.trim(),
      departmentRaw: row.department.trim(),
      roleKey,
    });
  }

  for (const row of laboratory.filter((item) => item.fullName.trim())) {
    const roleKey = 'laboratory';
    pushUser(users, {
      id: row.id,
      staffKind: kadrlarStaffKindFromRoleKey(roleKey),
      fullName: row.fullName.trim(),
      activityDirection: row.specialty.trim() || 'Laborant',
      position: row.specialty.trim() || 'Laborant',
      login: row.login.trim(),
      departmentRaw: row.department.trim(),
      roleKey,
    });
  }

  for (const row of receptionRaw.filter((item) => item.shortName?.trim())) {
    const roleKey = 'reception';
    pushUser(users, {
      id: row.id,
      staffKind: kadrlarStaffKindFromRoleKey(roleKey),
      fullName: row.shortName.trim(),
      activityDirection: row.roleName.trim() || 'Registrator',
      position: row.roleName.trim() || 'Registrator',
      login: row.username.trim(),
      departmentRaw: '',
      roleKey,
    });
  }

  for (const row of pharmacistsRaw.filter((item) => item.fullName?.trim())) {
    const roleKey = 'farmatsevt';
    pushUser(users, {
      id: row.id,
      staffKind: kadrlarStaffKindFromRoleKey(roleKey),
      fullName: row.fullName.trim(),
      activityDirection: row.specialty.trim() || 'Farmatsevt',
      position: row.specialty.trim() || 'Farmatsevt',
      login: row.login.trim(),
      departmentRaw: row.department.trim(),
      roleKey,
    });
  }

  for (const row of kitchenRaw.filter((item) => item.fullName?.trim())) {
    const roleKey = 'oshpaz';
    pushUser(users, {
      id: row.id,
      staffKind: kadrlarStaffKindFromRoleKey(roleKey),
      fullName: row.fullName.trim(),
      activityDirection: row.specialty.trim() || 'Oshpaz',
      position: row.specialty.trim() || 'Oshpaz',
      login: row.login.trim(),
      departmentRaw: row.department.trim(),
      roleKey,
    });
  }

  users.sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));
  return { users, departments };
}

export function filterUsersForDepartment(
  users: RawDepartmentUser[],
  department: DepartmentGroup,
  groups: DepartmentGroup[],
): RawDepartmentUser[] {
  const deptRole = normalizeKadrlarRoleKey(department.roleKey || '');

  return users.filter((user) => {
    const raw = user.departmentRaw.trim();
    if (raw && raw === department.id) return true;

    const resolved = resolveDepartmentDisplay(groups, raw);
    if (resolved.group?.id === department.id) return true;

    const userRole = normalizeKadrlarRoleKey(user.roleKey);
    if (!deptRole || userRole !== deptRole) return false;

    if (!raw) return true;

    if (resolved.group) return false;

    const foldedRaw = raw.toLowerCase();
    const foldedTitle = department.title.trim().toLowerCase();
    if (foldedRaw === foldedTitle) return true;

    return false;
  });
}

export async function listKadrlarUsersForDepartment(
  departmentId: string,
): Promise<{
  department: DepartmentGroup | null;
  users: KadrlarDepartmentUser[];
}> {
  const [{ users, departments }, profiles] = await Promise.all([
    listAllKadrlarDepartmentUsers(),
    listEmployeeProfiles(),
  ]);
  const department = findDepartmentById(departments, departmentId);
  if (!department) {
    return { department: null, users: [] };
  }

  const profileMap = buildProfileMap(profiles);
  const filtered = filterUsersForDepartment(users, department, departments);
  const enriched = filtered.map((user) => enrichDepartmentUser(user, profileMap));

  enriched.sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'uz'),
  );

  return { department, users: enriched };
}

export { splitFullName };
