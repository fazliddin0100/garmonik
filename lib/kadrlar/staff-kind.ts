import { normalizeKadrlarRoleKey } from '@/lib/kadrlar/roles';

export type KadrlarStaffKind =
  | 'doctor'
  | 'nurse'
  | 'laboratory'
  | 'reception'
  | 'pharmacist'
  | 'kitchen'
  | 'office';

export function kadrlarStaffKindFromRoleKey(
  roleKey: string,
  source: 'admin' | 'staff' = 'staff',
): KadrlarStaffKind {
  if (source === 'admin') return 'office';

  const key = normalizeKadrlarRoleKey(roleKey);
  if (key === 'shifokor') return 'doctor';
  if (key === 'nurse' || key === 'head_nurse') return 'nurse';
  if (key === 'laboratory' || key === 'lab_manager' || key === 'lab_results') {
    return 'laboratory';
  }
  if (key === 'reception') return 'reception';
  if (key === 'farmatsevt') return 'pharmacist';
  if (key === 'oshpaz') return 'kitchen';
  return 'office';
}

export function profileLookupKey(
  staffKind: KadrlarStaffKind,
  employeeId: string,
): string {
  return `${staffKind}:${employeeId.trim()}`;
}

export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const bits = fullName.trim().split(/\s+/).filter(Boolean);
  if (bits.length === 0) return { firstName: '', lastName: '' };
  if (bits.length === 1) return { firstName: bits[0], lastName: '' };
  return { firstName: bits[0], lastName: bits.slice(1).join(' ') };
}

export function birthYearFromAge(age: number | null | undefined): number | null {
  if (typeof age !== 'number' || !Number.isFinite(age) || age < 1 || age > 120) {
    return null;
  }
  return new Date().getFullYear() - Math.floor(age);
}
