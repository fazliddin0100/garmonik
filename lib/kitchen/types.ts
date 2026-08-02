export type KitchenProduct = {
  id: string;
  name: string;
  unit: string;
  /** Qoldiq miqdor */
  remainingQty: number;
  /** Minimal zaxira (ogohlantirish) */
  minQty: number;
  note: string;
  updatedAt: string;
};

export type KitchenStaffRow = {
  id: string;
  fullName: string;
  specialty: string;
  department: string;
  login: string;
  isActive: boolean;
};

export function normalizeKitchenProduct(raw: unknown): KitchenProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  if (typeof r.name !== 'string' || !r.name.trim()) return null;
  const remainingQty = Number(r.remainingQty);
  const minQty = Number(r.minQty);
  return {
    id: r.id.trim(),
    name: r.name.trim(),
    unit: typeof r.unit === 'string' && r.unit.trim() ? r.unit.trim() : 'kg',
    remainingQty: Number.isFinite(remainingQty) ? remainingQty : 0,
    minQty: Number.isFinite(minQty) ? minQty : 0,
    note: typeof r.note === 'string' ? r.note.trim() : '',
    updatedAt:
      typeof r.updatedAt === 'string' && r.updatedAt ?
        r.updatedAt
      : new Date().toISOString(),
  };
}

export function normalizeKitchenStaffRow(raw: unknown): KitchenStaffRow | null {
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
    specialty: typeof r.specialty === 'string' ? r.specialty.trim() : 'Oshpaz',
    department: typeof r.department === 'string' ? r.department.trim() : '',
    login: login.toLowerCase(),
    isActive:
      typeof r.isActive === 'boolean' ? r.isActive
      : String(r.status ?? 'актив').toLowerCase().includes('актив'),
  };
}

export function kitchenStaffToClinicJson(
  row: KitchenStaffRow,
): Record<string, unknown> {
  return {
    id: row.id,
    fullName: row.fullName,
    specialty: row.specialty,
    department: row.department,
    login: row.login,
    username: row.login,
    isActive: row.isActive,
    status: row.isActive ? 'Актив' : 'Nofaol',
  };
}
