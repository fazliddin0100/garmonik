import type { StaffRole } from '@/lib/staff-portal/types';

/** httpOnly session cookies — faqat server/middleware o‘qiydi */
export const ADMIN_SESSION_COOKIE = 'garmonik_admin_token';
export const STAFF_SESSION_COOKIE = 'garmonik_staff_token';

/** Boshqaruv paneli — faqat admin JWT */
export const ADMIN_ONLY_PREFIXES = [
  '/dashboard',
  '/security-center',
  '/users',
  '/kadrlar',
  '/patients',
  '/appointments',
  '/services',
  '/settings',
] as const;

/** Admin yoki xodim kabineti */
export const SHARED_STAFF_OR_ADMIN_PREFIXES = ['/reports'] as const;

/** Marshrut guruhi → URL prefikslari */
export const ROLE_ROUTE_PREFIXES = {
  clinical: ['/doctor'],
  laboratory: ['/labaratoriya'],
  nursing: ['/hamshiralar'],
  head_nursing: ['/bosh-hamshira'],
  office: ['/kabinet'],
  specialist: ['/mutaxassis'],
} as const;

export type StaffRouteGroup = keyof typeof ROLE_ROUTE_PREFIXES;

/** Har bir marshrut guruhiga ruxsat etilgan xodim rollari */
export const STAFF_ROLES_BY_ROUTE_GROUP: Record<StaffRouteGroup, readonly StaffRole[]> = {
  clinical: ['doctor', 'shifokor'],
  laboratory: ['laboratory'],
  nursing: ['nurse'],
  head_nursing: ['head_nurse'],
  office: ['kabinet'],
  specialist: ['specialist'],
};
