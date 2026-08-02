import {
  adminHomePathForRouteGroup,
  adminRoleLabelToJwtRouteGroup,
  isAdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import {
  kadrlarHomePath,
} from '@/lib/kadrlar/home-path';
import {
  isKadrlarManagedAdminRouteGroup,
  kadrlarRoleKeyFromAdminProfile,
  normalizeKadrlarRoleKey,
} from '@/lib/kadrlar/roles';
import {
  findPortalLoginByCredential,
  type PortalProfileRow,
} from '@/lib/db/portal-profiles';
import { staffHomePath } from '@/lib/staff-portal/staff-home';
import { isStaffRole, type StaffRole } from '@/lib/staff-portal/types';

export type PortalLoginProfile = PortalProfileRow;

export { findPortalLoginByCredential };

export function portalLoginRedirect(row: PortalLoginProfile, loginNorm: string): string {
  if (row.account_kind === 'staff' && isStaffRole(row.staff_role || '')) {
    return staffHomePath(row.staff_role as StaffRole);
  }
  const fromLabel = adminRoleLabelToJwtRouteGroup(
    row.role_label,
    row.staff_login || loginNorm,
  );
  if (fromLabel !== 'admin_only') {
    return adminHomePathForRouteGroup(fromLabel);
  }
  if (row.admin_route_group && isAdminJwtRouteGroup(row.admin_route_group)) {
    return adminHomePathForRouteGroup(row.admin_route_group);
  }
  return kadrlarHomePath(kadrlarRoleKeyFromAdminProfile(row), loginNorm);
}

export function portalLoginRoleKey(row: PortalLoginProfile): string {
  if (row.account_kind === 'staff') {
    return normalizeKadrlarRoleKey(row.staff_role || '');
  }
  return kadrlarRoleKeyFromAdminProfile(row);
}

export { isKadrlarManagedAdminRouteGroup };
