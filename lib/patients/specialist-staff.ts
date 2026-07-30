import {
  findNarrowSpecialist,
  type NarrowSpecialistId,
} from '@/lib/patients/specialist-consultation';

export const SPECIALIST_DEPARTMENT_PREFIX = 'specialist:';

export function encodeSpecialistDepartment(specialistId: NarrowSpecialistId): string {
  return `${SPECIALIST_DEPARTMENT_PREFIX}${specialistId}`;
}

export function parseNarrowSpecialistIdFromDepartment(
  department: string | null | undefined,
): NarrowSpecialistId | null {
  const raw = typeof department === 'string' ? department.trim() : '';
  if (!raw.startsWith(SPECIALIST_DEPARTMENT_PREFIX)) return null;
  const id = raw.slice(SPECIALIST_DEPARTMENT_PREFIX.length);
  return findNarrowSpecialist(id)?.id ?? null;
}

export function isSpecialistRoleKey(roleKey: string): boolean {
  return normalizeSpecialistRoleKey(roleKey).startsWith('specialist_');
}

export function normalizeSpecialistRoleKey(roleKey: string): string {
  return roleKey.trim().toLowerCase();
}

export function narrowSpecialistIdFromRoleKey(roleKey: string): NarrowSpecialistId | null {
  const key = normalizeSpecialistRoleKey(roleKey);
  if (!key.startsWith('specialist_')) return null;
  const id = key.slice('specialist_'.length);
  return findNarrowSpecialist(id)?.id ?? null;
}

export function specialistRoleKeyFromId(id: NarrowSpecialistId): string {
  return `specialist_${id}`;
}
