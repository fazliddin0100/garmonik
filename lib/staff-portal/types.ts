export type StaffRole =
  /** Eski yozuvlar; yangi uchun `shifokor` ishlatiladi */
  | 'doctor'
  | 'shifokor'
  | 'laboratory'
  | 'nurse'
  | 'head_nurse'
  | 'kabinet'
  | 'specialist'
  | 'farmatsevt'
  | 'oshpaz';

export type StaffAccount = {
  id: string;
  fullName: string;
  /** Tibbiy `StaffRole` yoki kadrlar office roli (`finance`, `hr`, …) */
  role: StaffRole | string;
  login: string;
  /** bcrypt hash */
  passwordHash: string;
  department: string;
  isDepartmentHead?: boolean;
  isActive: boolean;
  createdAt: string;
};

export type StaffSession = {
  id: string;
  login: string;
  fullName: string;
  role: StaffRole;
};

export const STAFF_ACCOUNTS_STORAGE_KEY = 'garmonik-staff-accounts-v1';
export const STAFF_SESSION_STORAGE_KEY = 'garmonik-staff-session-v1';

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  doctor: 'Shifokor (eski)',
  shifokor: 'Shifokor',
  laboratory: 'Laboratoriya',
  nurse: 'Hamshira',
  head_nurse: 'Bosh hamshira',
  kabinet: 'Kabinet',
  specialist: 'Tor mutaxassis',
  farmatsevt: 'Farmatsevt',
  oshpaz: 'Oshpaz',
};

const STAFF_ROLE_SET = new Set<string>(
  Object.keys(STAFF_ROLE_LABELS) as StaffRole[],
);

export function isStaffRole(r: string): r is StaffRole {
  return STAFF_ROLE_SET.has(r);
}
