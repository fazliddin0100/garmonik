import { adminDisplayName, type AdminUser } from '@/lib/admins/types';
import {
  normalizeDepartmentGroups,
  resolveDepartmentDisplay,
} from '@/lib/clinic-departments/roles';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';
import { readClinicResource } from '@/lib/server/clinic-resource-service';
import { listDoctorStaffAccounts } from '@/lib/doctors/db-doctors';
import type { DoctorRow } from '@/lib/doctors/types';
import { listLaboratoryStaffAccounts } from '@/lib/laboratory-staff/db-lab-staff';
import { listNurseStaffAccounts } from '@/lib/nurses/db-nurses';
import { listReceptionStaffAccounts } from '@/lib/reception/db-reception-staff';
import { listKitchenStaffAccounts } from '@/lib/kitchen/db-kitchen-staff';
import type { KitchenStaffRow } from '@/lib/kitchen/types';
import { listPharmacistStaffAccounts } from '@/lib/pharmacists/db-pharmacists';
import type { PharmacistRow } from '@/lib/pharmacists/types';
import type { ReceptionUser } from '@/lib/reception/types';

export type KadrlarOverviewUser = {
  id: string;
  fullName: string;
  position: string;
  login: string;
  department?: string;
};

export type KadrlarOverviewSectionId =
  | 'admins'
  | 'office-support'
  | 'doctors'
  | 'nurses'
  | 'laboratory'
  | 'reception'
  | 'pharmacists'
  | 'kitchen';

export type KadrlarOverviewSection = {
  id: KadrlarOverviewSectionId;
  title: string;
  users: KadrlarOverviewUser[];
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function deptLabel(
  groups: DepartmentGroup[],
  department: string | null | undefined,
  fallback: string,
): { position: string; department: string } {
  const resolved = resolveDepartmentDisplay(groups, department);
  if (resolved.group) {
    const rolePart = resolved.roleLabel ? ` · ${resolved.roleLabel}` : '';
    return {
      position: `${resolved.title}${rolePart}`,
      department: resolved.title,
    };
  }
  if (resolved.title) {
    return { position: resolved.title, department: resolved.title };
  }
  return { position: fallback, department: '' };
}

function normalizeAdmin(item: unknown): KadrlarOverviewUser | null {
  if (!item || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id.trim()) return null;
  if (typeof row.username !== 'string' || !row.username.trim()) return null;

  const legacyShort = typeof row.shortName === 'string' ? row.shortName.trim() : '';
  let firstName = typeof row.firstName === 'string' ? row.firstName.trim() : '';
  let lastName = typeof row.lastName === 'string' ? row.lastName.trim() : '';
  if (!firstName && !lastName && legacyShort) {
    const bits = legacyShort.split(/\s+/).filter(Boolean);
    firstName = bits[0] ?? '';
    lastName = bits.slice(1).join(' ');
  }
  if (!firstName && !lastName) return null;

  const admin: AdminUser = {
    id: row.id.trim(),
    firstName,
    lastName,
    fatherName: typeof row.fatherName === 'string' ? row.fatherName.trim() : '—',
    age: 0,
    roleName: typeof row.roleName === 'string' ? row.roleName.trim() : 'Administrator',
    username: row.username.trim(),
    phone: typeof row.phone === 'string' ? row.phone : '',
    password: typeof row.password === 'string' ? row.password : '',
    securityPin: typeof row.securityPin === 'string' ? row.securityPin : '',
  };

  return {
    id: admin.id,
    fullName: adminDisplayName(admin),
    position: admin.roleName || 'Administrator',
    login: admin.username,
    department: admin.roleName || '',
  };
}

function doctorUser(
  row: DoctorRow,
  groups: DepartmentGroup[],
): KadrlarOverviewUser {
  const { position, department } = deptLabel(
    groups,
    row.department,
    row.specialty.trim() || 'Shifokor',
  );
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    position,
    login: row.login.trim() || row.username.trim(),
    department,
  };
}

function receptionUser(row: ReceptionUser): KadrlarOverviewUser {
  return {
    id: row.id,
    fullName: row.shortName.trim(),
    position: row.roleName.trim() || 'Registrator',
    login: row.username.trim(),
  };
}

function pharmacistUser(row: PharmacistRow): KadrlarOverviewUser {
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    position: row.specialty.trim() || 'Farmatsevt',
    login: row.login.trim(),
  };
}

function kitchenUser(row: KitchenStaffRow): KadrlarOverviewUser {
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    position: row.specialty.trim() || 'Oshpaz',
    login: row.login.trim(),
    department: row.department.trim() || 'Oshxona',
  };
}

export async function listKadrlarUsersOverview(): Promise<KadrlarOverviewSection[]> {
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

  const departmentGroups = normalizeDepartmentGroups(departmentsRaw);

  const allAdmins = asArray<unknown>(adminsRaw)
    .map(normalizeAdmin)
    .filter((row): row is KadrlarOverviewUser => row !== null)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  /** To‘liq admin emas — cheklangan kabinet (Ta'minot, HR, Xo‘jalik, …) */
  const isOfficeSupportUser = (position: string) => {
    const p = position
      .toLowerCase()
      .replace(/[''`ʻʼ‘’]/g, "'");
    return /ta'?minot|xarid|kadrlar|\bhr\b|moliya|buxgalter|marketing|registrator|qabul|it\s*\/|texnik yordam|yurist|xo'?jalik|xavfsizlik|kassir|kassa|farmatsevt/i.test(
      p,
    );
  };

  const admins = allAdmins.filter((u) => !isOfficeSupportUser(u.position));
  const officeSupport = allAdmins.filter((u) => isOfficeSupportUser(u.position));

  const doctors = doctorsRaw
    .filter((row) => row.fullName?.trim())
    .map((row) => doctorUser(row, departmentGroups))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const nursesUsers: KadrlarOverviewUser[] = nurses
    .filter((row) => row.fullName.trim())
    .map((row) => {
      const fallback =
        row.specialty.trim() ||
        (row.staffRole === 'head_nurse' ? 'Bosh hamshira' : 'Hamshira');
      const { position, department } = deptLabel(
        departmentGroups,
        row.department,
        fallback,
      );
      return {
        id: row.id,
        fullName: row.fullName.trim(),
        position,
        login: row.login.trim(),
        department,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const laboratoryUsers: KadrlarOverviewUser[] = laboratory
    .filter((row) => row.fullName.trim())
    .map((row) => {
      const { position, department } = deptLabel(
        departmentGroups,
        row.department,
        row.specialty.trim() || 'Laborant',
      );
      return {
        id: row.id,
        fullName: row.fullName.trim(),
        position,
        login: row.login.trim(),
        department,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const reception = receptionRaw
    .filter((row) => row.shortName?.trim())
    .map(receptionUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const pharmacists = pharmacistsRaw
    .filter((row) => row.fullName?.trim())
    .map(pharmacistUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const kitchen = kitchenRaw
    .filter((row) => row.fullName?.trim())
    .map(kitchenUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  /** Bo‘sh bo‘limlar ham tugma sifatida ko‘rinsin */
  return [
    { id: 'admins', title: 'Administratorlar', users: admins },
    {
      id: 'office-support',
      title: "Ma'muriy xodimlar",
      users: officeSupport,
    },
    { id: 'doctors', title: 'Shifokorlar', users: doctors },
    { id: 'nurses', title: 'Hamshiralar', users: nursesUsers },
    { id: 'laboratory', title: 'Laboratoriya', users: laboratoryUsers },
    { id: 'reception', title: 'Qabul', users: reception },
    { id: 'pharmacists', title: 'Farmatsevtlar', users: pharmacists },
    { id: 'kitchen', title: 'Oshxona', users: kitchen },
  ];
}
