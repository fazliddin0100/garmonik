import type { AdminJwtRouteGroup } from '@/lib/admins/portal-routes';

type SessionLike = { routeGroup: AdminJwtRouteGroup } | null | undefined;

/** Bo‘lim staff CRUD — faqat admin_only yoki tegishli department. */
export function canManageDepartmentStaff(
  session: SessionLike,
  departmentGroups: AdminJwtRouteGroup | readonly AdminJwtRouteGroup[],
): boolean {
  if (!session) return false;
  if (session.routeGroup === 'admin_only') return true;
  const allowed: readonly AdminJwtRouteGroup[] = Array.isArray(
    departmentGroups,
  )
    ? departmentGroups
    : [departmentGroups];
  return allowed.includes(session.routeGroup);
}

export function canAccessKadrlarHr(session: SessionLike): boolean {
  return canManageDepartmentStaff(session, 'hr');
}
