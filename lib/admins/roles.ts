import { KADRLAR_ROLE_OPTIONS } from '@/lib/kadrlar/roles';
import {
  BUILTIN_ADMIN_SUPPORT_ROLES,
  isSuperAdminRoleName,
  rolesMatch,
} from '@/lib/users/admin-support-roles';

export type AdminRoleOption = { value: string; label: string };

/** Yangi administrator yaratish — faqat ikkita rol (AdminsPanel) */
export const ADMIN_CREATION_ROLE_OPTIONS: AdminRoleOption[] = [
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Super administrator', label: 'Super administrator' },
];

/** @deprecated Admin yaratish uchun ADMIN_CREATION_ROLE_OPTIONS ishlating */
export const ADMIN_ROLE_OPTIONS: AdminRoleOption[] = ADMIN_CREATION_ROLE_OPTIONS;

export const ADMIN_ROLE_VALUES = new Set(
  ADMIN_CREATION_ROLE_OPTIONS.map((o) => o.value),
);

export function isAllowedAdminCreationRole(roleName: string): boolean {
  const t = roleName.trim();
  return ADMIN_CREATION_ROLE_OPTIONS.some((o) => o.value === t);
}

/**
 * Administratorlar ro‘yxatida ko‘rsatiladigan rollar:
 * Super administrator va Administrator (admin).
 */
export function isCoreAdminListRole(roleName: string): boolean {
  const t = roleName.trim();
  if (!t) return false;
  if (isSuperAdminRoleName(t)) return true;
  if (rolesMatch(t, 'Administrator') || rolesMatch(t, 'admin')) return true;
  return ADMIN_CREATION_ROLE_OPTIONS.some((o) => rolesMatch(o.value, t));
}

/**
 * Portal admin hisobi: Administrator + Ma'muriy/xizmat (Kassir, Buxgalter, …)
 * va Kadrlar panelidagi office admin rollari.
 */
export function isAllowedPortalAdminCreationRole(roleName: string): boolean {
  const t = roleName.trim();
  if (!t) return false;
  if (isAllowedAdminCreationRole(t)) return true;
  if (BUILTIN_ADMIN_SUPPORT_ROLES.some((r) => rolesMatch(r.roleLabel, t))) {
    return true;
  }
  return KADRLAR_ROLE_OPTIONS.some(
    (r) =>
      r.accountKind === 'admin' &&
      (rolesMatch(r.roleLabel || r.label, t) || rolesMatch(r.label, t)),
  );
}

export function defaultAdminCreationRole(): string {
  return ADMIN_CREATION_ROLE_OPTIONS[0].value;
}
