export type PharmacistRow = {
  id: string;
  code: string;
  fullName: string;
  specialty: string;
  degree: string;
  department: string;
  contact: string;
  login: string;
  password?: string;
  status: string;
};

export type PharmacistSortKey =
  | 'id'
  | 'code'
  | 'fullName'
  | 'specialty'
  | 'degree'
  | 'department'
  | 'contact'
  | 'login'
  | 'status';

export const PHARMACISTS_STORAGE_KEY = 'garmonik-pharmacists-v1';

export function normalizePharmacistRow(raw: unknown): PharmacistRow | null {
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
  const isActive =
    typeof r.isActive === 'boolean' ? r.isActive
    : String(r.status ?? 'актив').toLowerCase().includes('актив');
  return {
    id,
    code: typeof r.code === 'string' ? r.code : '',
    fullName,
    specialty:
      typeof r.specialty === 'string' ? r.specialty.trim()
      : typeof r.roleName === 'string' ? r.roleName.trim()
      : 'Farmatsevt',
    degree: typeof r.degree === 'string' ? r.degree : '',
    department: typeof r.department === 'string' ? r.department.trim() : '',
    contact: typeof r.contact === 'string' ? r.contact : '',
    login: login.toLowerCase(),
    status: isActive ? 'Актив' : 'Nofaol',
  };
}

export function pharmacistToClinicJson(row: PharmacistRow): Record<string, unknown> {
  return {
    id: row.id,
    code: row.code,
    fullName: row.fullName,
    specialty: row.specialty,
    degree: row.degree,
    department: row.department,
    contact: row.contact,
    login: row.login,
    username: row.login,
    status: row.status,
    isActive: String(row.status).toLowerCase().includes('актив'),
  };
}
