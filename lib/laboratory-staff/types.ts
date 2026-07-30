export type LaboratoryStaffRow = {
  id: string;
  fullName: string;
  specialty: string;
  department: string;
  login: string;
  isActive: boolean;
};

export type LaboratoryStaffSortKey =
  | 'fullName'
  | 'specialty'
  | 'department'
  | 'login';

export const LABORATORY_STAFF_STORAGE_KEY = 'garmonik-laboratory-staff-v1';

/** Eski JSON qatorlarini yangi formatga */
export function normalizeLaboratoryStaffRow(raw: unknown): LaboratoryStaffRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === 'string' && r.id.trim() ? r.id.trim()
    : typeof r.user_id === 'string' ? r.user_id
    : '';
  const fullName = typeof r.fullName === 'string' ? r.fullName.trim() : '';
  const login =
    (typeof r.login === 'string' && r.login.trim()) ||
    (typeof r.username === 'string' && r.username.trim()) ||
    '';
  if (!id || !fullName) return null;
  return {
    id,
    fullName,
    specialty: typeof r.specialty === 'string' ? r.specialty.trim() : '',
    department: typeof r.department === 'string' ? r.department.trim() : '',
    login: login.toLowerCase(),
    isActive:
      typeof r.isActive === 'boolean' ? r.isActive
      : String(r.status ?? 'актив').toLowerCase().includes('актив'),
  };
}

export function laboratoryStaffToClinicJson(row: LaboratoryStaffRow): Record<string, unknown> {
  return {
    id: row.id,
    fullName: row.fullName,
    specialty: row.specialty,
    department: row.department,
    login: row.login,
    isActive: row.isActive,
    status: row.isActive ? 'Актив' : 'Nofaol',
    code: '',
    roomNumber: '',
    degree: '',
    position: '',
    contact: '',
    username: row.login,
  };
}
