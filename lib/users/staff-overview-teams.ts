import type { DoctorRow } from '@/lib/doctors/types';
import type { LaboratoryStaffRow } from '@/lib/laboratory-staff/types';
import type { NurseRow } from '@/lib/nurses/types';
import type { PharmacistRow } from '@/lib/pharmacists/types';
import type { ReceptionUser } from '@/lib/reception/types';

export type StaffTeamMember = {
  id: string;
  fullName: string;
  role: string;
  department: string;
  login: string;
  contact: string;
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function includesAny(text: string, keywords: string[]): boolean {
  const haystack = norm(text);
  return keywords.some((keyword) => haystack.includes(norm(keyword)));
}

function doctorText(row: DoctorRow): string {
  return [
    row.fullName,
    row.specialty,
    row.position,
    row.department,
    row.degree,
  ].join(' ');
}

function nurseText(row: NurseRow): string {
  return [row.fullName, row.specialty, row.department].join(' ');
}

export function isChiefDoctor(row: DoctorRow): boolean {
  return includesAny(doctorText(row), [
    'direktor',
    'bosh shifokor',
    'tibbiy direktor',
  ]);
}

export function isSurgeryDoctor(row: DoctorRow): boolean {
  return includesAny(doctorText(row), [
    'jarroh',
    'anestez',
    'xirurg',
    'jarrohlik',
    'hirurg',
    'surgeon',
  ]);
}

export function isSurgeryNurse(row: NurseRow): boolean {
  return includesAny(nurseText(row), ['operatsion', 'jarroh', 'anestez']);
}

export function toDoctorMember(row: DoctorRow): StaffTeamMember {
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    role: row.specialty.trim() || row.position.trim() || 'Shifokor',
    department: row.department.trim(),
    login: row.login.trim() || row.username.trim(),
    contact: row.contact.trim(),
  };
}

export function toNurseMember(row: NurseRow): StaffTeamMember {
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    role: row.specialty.trim() || 'Hamshira',
    department: row.department.trim(),
    login: row.login.trim(),
    contact: row.contact.trim(),
  };
}

export function toLabMember(row: LaboratoryStaffRow): StaffTeamMember {
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    role: row.specialty.trim() || 'Laborant',
    department: row.department.trim(),
    login: row.login.trim(),
    contact: '',
  };
}

export function toReceptionMember(row: ReceptionUser): StaffTeamMember {
  return {
    id: row.id,
    fullName: row.shortName.trim(),
    role: row.roleName.trim() || 'Registrator',
    department: row.department?.trim() || row.roleName.trim() || 'Qabulxona',
    login: row.username.trim(),
    contact: row.email.trim(),
  };
}

export function toPharmacistMember(row: PharmacistRow): StaffTeamMember {
  return {
    id: row.id,
    fullName: row.fullName.trim(),
    role: row.specialty.trim() || 'Farmatsevt',
    department: row.department.trim(),
    login: row.login.trim(),
    contact: row.contact.trim(),
  };
}

export type StaffOverviewData = {
  doctors: DoctorRow[];
  nurses: NurseRow[];
  labStaff: LaboratoryStaffRow[];
  reception: ReceptionUser[];
  pharmacists: PharmacistRow[];
};

export function buildCoreTeamMembers(data: StaffOverviewData) {
  const doctors = data.doctors.filter((row) => row.fullName.trim());
  const nurses = data.nurses.filter((row) => row.fullName.trim());

  const chiefDoctors = doctors.filter(isChiefDoctor).map(toDoctorMember);
  const chiefDoctorIds = new Set(chiefDoctors.map((row) => row.id));

  const surgeryDoctors = doctors
    .filter((row) => !chiefDoctorIds.has(row.id) && isSurgeryDoctor(row))
    .map(toDoctorMember);
  const surgeryDoctorIds = new Set(surgeryDoctors.map((row) => row.id));

  const surgeryNurses = nurses.filter(isSurgeryNurse).map(toNurseMember);
  const surgeryNurseIds = new Set(surgeryNurses.map((row) => row.id));

  const generalDoctors = doctors
    .filter((row) => !chiefDoctorIds.has(row.id) && !surgeryDoctorIds.has(row.id))
    .map(toDoctorMember);

  const generalNurses = nurses
    .filter((row) => !surgeryNurseIds.has(row.id))
    .map(toNurseMember);

  return {
    chiefDoctors,
    generalDoctors,
    surgeryTeam: [...surgeryDoctors, ...surgeryNurses],
    generalNurses,
    labStaff: data.labStaff
      .filter((row) => row.fullName.trim())
      .map(toLabMember),
    reception: data.reception
      .filter((row) => row.shortName.trim())
      .map(toReceptionMember),
    pharmacists: data.pharmacists
      .filter((row) => row.fullName.trim())
      .map(toPharmacistMember),
  };
}

export function findMembersByKeywords(
  members: StaffTeamMember[],
  keywords: string[],
): StaffTeamMember[] {
  return members.filter((member) =>
    includesAny(
      [member.fullName, member.role, member.department, member.contact].join(' '),
      keywords,
    ),
  );
}

export function allOverviewMembers(data: StaffOverviewData): StaffTeamMember[] {
  const teams = buildCoreTeamMembers(data);
  return [
    ...teams.chiefDoctors,
    ...teams.generalDoctors,
    ...teams.surgeryTeam,
    ...teams.generalNurses,
    ...teams.labStaff,
    ...teams.reception,
    ...teams.pharmacists,
  ];
}
