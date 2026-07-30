export type NurseStaffRole = 'nurse' | 'head_nurse';

export type NurseRow = {
  id: string;
  fullName: string;
  specialty: string;
  department: string;
  contact: string;
  login: string;
  isActive: boolean;
  staffRole: NurseStaffRole;
};

export type NurseSortKey =
  | 'fullName'
  | 'specialty'
  | 'department'
  | 'contact'
  | 'login'
  | 'staffRole';

export const NURSES_STORAGE_KEY = 'garmonik-nurses-v1';

export function normalizeNurseStaffRole(raw: unknown): NurseStaffRole {
  return raw === 'head_nurse' ? 'head_nurse' : 'nurse';
}

export function nurseStaffRoleLabel(role: NurseStaffRole): string {
  return role === 'head_nurse' ? 'Bosh hamshira' : 'Hamshira';
}

export function normalizeNurseRow(raw: unknown): NurseRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === 'string' && r.id.trim() ? r.id.trim()
    : typeof r.user_id === 'string' ? r.user_id
    : '';
  const fullName = typeof r.fullName === 'string' ? r.fullName.trim() : '';
  const login = typeof r.login === 'string' ? r.login.trim() : '';
  if (!id || !fullName) return null;
  return {
    id,
    fullName,
    specialty: typeof r.specialty === 'string' ? r.specialty.trim() : '',
    department: typeof r.department === 'string' ? r.department.trim() : '',
    contact: typeof r.contact === 'string' ? r.contact.trim() : '',
    login: login.toLowerCase(),
    isActive:
      typeof r.isActive === 'boolean' ? r.isActive
      : String(r.status ?? 'актив').toLowerCase().includes('актив'),
    staffRole: normalizeNurseStaffRole(r.staffRole ?? r.staff_role),
  };
}

export function nurseToClinicJson(row: NurseRow): Record<string, unknown> {
  return {
    id: row.id,
    photo: '',
    fullName: row.fullName,
    specialty: row.specialty,
    department: row.department,
    contact: row.contact,
    login: row.login,
    isActive: row.isActive,
    status: row.isActive ? 'Актив' : 'Nofaol',
    staffRole: row.staffRole,
    code: '',
    degree: '',
  };
}
