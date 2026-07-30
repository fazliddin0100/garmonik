import { adminHomePathForRouteGroup } from '@/lib/admins/portal-routes';
import { getKadrlarRole, resolveKadrlarRole } from '@/lib/kadrlar/roles';
import { staffHomePath } from '@/lib/staff-portal/staff-home';

/** Kadrlar xodimi kirgandan keyin yo‘naltirish */
export function kadrlarHomePath(roleKey: string, login = ''): string {
  const resolved = resolveKadrlarRole(roleKey, login);
  if (resolved.accountKind === 'staff' && resolved.staffRole) {
    return staffHomePath(resolved.staffRole);
  }
  if (resolved.adminRouteGroup) {
    return adminHomePathForRouteGroup(resolved.adminRouteGroup);
  }
  const opt = getKadrlarRole(roleKey);
  if (opt?.adminRouteGroup) {
    return adminHomePathForRouteGroup(opt.adminRouteGroup);
  }
  return '/dashboard';
}
