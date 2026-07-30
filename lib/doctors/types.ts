export type DoctorRow = {
  id: string;
  code: string;
  fullName: string;
  roomNumber: string;
  specialty: string;
  degree: string;
  department: string;
  position: string;
  contact: string;
  status: string;
  username: string;
  login: string;
};

export type DoctorSortKey =
  | 'id'
  | 'code'
  | 'fullName'
  | 'roomNumber'
  | 'specialty'
  | 'degree'
  | 'department'
  | 'position'
  | 'contact'
  | 'status'
  | 'username'
  | 'login';

export const DOCTORS_STORAGE_KEY = 'garmonik-doctors-v1';

export function normalizeDoctorRow(raw: unknown): DoctorRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id =
    typeof r.id === 'string' && r.id.trim() ? r.id.trim()
    : typeof r.user_id === 'string' ? r.user_id
    : '';
  const fullName = typeof r.fullName === 'string' ? r.fullName.trim() : '';
  if (!id || !fullName) return null;
  const login =
    typeof r.login === 'string' ? r.login.trim().toLowerCase()
    : typeof r.username === 'string' ? r.username.trim().toLowerCase()
    : '';
  const isActive =
    typeof r.isActive === 'boolean' ? r.isActive
    : String(r.status ?? 'актив').toLowerCase().includes('актив');
  return {
    id,
    code: typeof r.code === 'string' ? r.code.trim() : '',
    fullName,
    roomNumber: typeof r.roomNumber === 'string' ? r.roomNumber.trim() : '',
    specialty: typeof r.specialty === 'string' ? r.specialty.trim() : '',
    degree: typeof r.degree === 'string' ? r.degree.trim() : '',
    department: typeof r.department === 'string' ? r.department.trim() : '',
    position: typeof r.position === 'string' ? r.position.trim() : '',
    contact: typeof r.contact === 'string' ? r.contact.trim() : '',
    status: isActive ? 'Актив' : 'Nofaol',
    username: login,
    login,
  };
}

export function doctorToClinicJson(row: DoctorRow): Record<string, unknown> {
  return {
    id: row.id,
    code: row.code,
    fullName: row.fullName,
    roomNumber: row.roomNumber,
    specialty: row.specialty,
    degree: row.degree,
    department: row.department,
    position: row.position,
    contact: row.contact,
    status: row.status,
    username: row.username || row.login,
    login: row.login,
    isActive: String(row.status).toLowerCase().includes('актив'),
  };
}
