import { adminDisplayName, type AdminUser } from '@/lib/admins/types';
import { readClinicResource } from '@/lib/server/clinic-resource-service';
import { listDoctorStaffAccounts } from '@/lib/doctors/db-doctors';
import type { DoctorRow } from '@/lib/doctors/types';
import { listLaboratoryStaffAccounts } from '@/lib/laboratory-staff/db-lab-staff';
import { listNurseStaffAccounts } from '@/lib/nurses/db-nurses';
import { listReceptionStaffAccounts } from '@/lib/reception/db-reception-staff';
import type { PharmacistRow } from '@/lib/pharmacists/types';
import type { ReceptionUser } from '@/lib/reception/types';

export type KadrlarOverviewUser = {
  id: string;
  fullName: string;
  position: string;
  login: string;
};

export type KadrlarOverviewSectionId =
  | 'admins'
  | 'doctors'
  | 'nurses'
  | 'laboratory'
  | 'reception'
  | 'pharmacists';

export type KadrlarOverviewSection = {
  id: KadrlarOverviewSectionId;
  title: string;
  users: KadrlarOverviewUser[];
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
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
  };
}

function doctorUser(row: DoctorRow): KadrlarOverviewUser {
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    position: row.specialty.trim() || row.department.trim() || 'Shifokor',
    login: row.login.trim() || row.username.trim(),
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

export async function listKadrlarUsersOverview(): Promise<KadrlarOverviewSection[]> {
  const [adminsRaw, doctorsRaw, nurses, laboratory, receptionRaw, pharmacistsRaw] =
    await Promise.all([
      readClinicResource('admins'),
      listDoctorStaffAccounts(),
      listNurseStaffAccounts(),
      listLaboratoryStaffAccounts(),
      listReceptionStaffAccounts(),
      readClinicResource('pharmacists'),
    ]);

  const admins = asArray<unknown>(adminsRaw)
    .map(normalizeAdmin)
    .filter((row): row is KadrlarOverviewUser => row !== null)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const doctors = doctorsRaw
    .filter((row) => row.fullName?.trim())
    .map(doctorUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const nursesUsers: KadrlarOverviewUser[] = nurses
    .filter((row) => row.fullName.trim())
    .map((row) => ({
      id: row.id,
      fullName: row.fullName.trim(),
      position:
        row.specialty.trim() ||
        (row.staffRole === 'head_nurse' ? 'Bosh hamshira' : 'Hamshira'),
      login: row.login.trim(),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const laboratoryUsers: KadrlarOverviewUser[] = laboratory
    .filter((row) => row.fullName.trim())
    .map((row) => ({
      id: row.id,
      fullName: row.fullName.trim(),
      position: row.specialty.trim() || row.department.trim() || 'Laborant',
      login: row.login.trim(),
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const reception = receptionRaw
    .filter((row) => row.shortName?.trim())
    .map(receptionUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  const pharmacists = asArray<PharmacistRow>(pharmacistsRaw)
    .filter((row) => row.fullName?.trim())
    .map(pharmacistUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

  return [
    { id: 'admins', title: 'Administratorlar', users: admins },
    { id: 'doctors', title: 'Shifokorlar', users: doctors },
    { id: 'nurses', title: 'Hamshiralar', users: nursesUsers },
    { id: 'laboratory', title: 'Laboratoriya xodimlari', users: laboratoryUsers },
    { id: 'reception', title: 'Qabul xodimlari', users: reception },
    { id: 'pharmacists', title: 'Farmatsevtlar', users: pharmacists },
  ];
}
