import {
  buildCoreTeamMembers,
  type StaffOverviewData,
  type StaffTeamMember,
} from '@/lib/users/staff-overview-teams';

export type CoreTeamKey =
  | 'chief_doctors'
  | 'general_doctors'
  | 'surgery_team'
  | 'general_nurses'
  | 'lab_staff'
  | 'reception'
  | 'pharmacists';

export type MedicalStaffKind =
  | 'doctor'
  | 'nurse'
  | 'laboratory'
  | 'reception'
  | 'pharmacist';

export type CoreTeamCardData = {
  teamKey: CoreTeamKey;
  title: string;
  members: StaffTeamMember[];
  staffKind: MedicalStaffKind | 'mixed';
  defaultSpecialty?: string;
  defaultPosition?: string;
  defaultDepartment?: string;
  defaultRoleName?: string;
};

export function buildCoreTeamCards(data: StaffOverviewData): CoreTeamCardData[] {
  const teams = buildCoreTeamMembers(data);
  return [
    {
      teamKey: 'chief_doctors',
      title: 'Bosh shifokor / Tibbiy direktor',
      members: teams.chiefDoctors,
      staffKind: 'doctor',
      defaultSpecialty: 'Bosh shifokor',
      defaultPosition: 'Tibbiy direktor',
    },
    {
      teamKey: 'general_doctors',
      title:
        'Shifokorlar (terapevt, endokrinolog, kardiolog, nevrolog, ginekolog, pediatr)',
      members: teams.generalDoctors,
      staffKind: 'doctor',
      defaultSpecialty: 'Shifokor',
    },
    {
      teamKey: 'surgery_team',
      title: 'Jarrohlik jamoasi (jarroh, anesteziolog, operatsion hamshira)',
      members: teams.surgeryTeam,
      staffKind: 'mixed',
    },
    {
      teamKey: 'general_nurses',
      title: 'Hamshiralar (statsionar, ambulator, muolaja xonasi)',
      members: teams.generalNurses,
      staffKind: 'nurse',
      defaultSpecialty: 'Hamshira',
    },
    {
      teamKey: 'lab_staff',
      title: 'Laboratoriya xodimlari (laborant, bioximik, PCR mutaxassisi)',
      members: teams.labStaff,
      staffKind: 'laboratory',
      defaultSpecialty: 'Laborant',
      defaultDepartment: 'Laboratoriya',
    },
    {
      teamKey: 'reception',
      title: 'Qabulxona va registratura xodimlari',
      members: teams.reception,
      staffKind: 'reception',
      defaultRoleName: 'Registrator',
      defaultDepartment: 'Qabulxona',
    },
    {
      teamKey: 'pharmacists',
      title: "Farmatsevtlar va dori ombori mas'ullari",
      members: teams.pharmacists,
      staffKind: 'pharmacist',
      defaultSpecialty: 'Farmatsevt',
      defaultDepartment: 'Dori ombori',
    },
  ];
}

export function findCoreTeamCard(
  data: StaffOverviewData,
  teamKey: CoreTeamKey,
): CoreTeamCardData | null {
  return buildCoreTeamCards(data).find((team) => team.teamKey === teamKey) ?? null;
}

export function resolveMedicalStaffKind(
  teamKey: CoreTeamKey,
  memberId: string,
  data: StaffOverviewData,
): MedicalStaffKind | null {
  const card = findCoreTeamCard(data, teamKey);
  if (!card) return null;
  if (card.staffKind !== 'mixed') return card.staffKind;

  if (data.doctors.some((row) => row.id === memberId)) return 'doctor';
  if (data.nurses.some((row) => row.id === memberId)) return 'nurse';
  return null;
}
