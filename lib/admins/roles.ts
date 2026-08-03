export type AdminRoleOption = { value: string; label: string };

/** Yangi administrator yaratish — faqat ikkita rol */
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

export function defaultAdminCreationRole(): string {
  return ADMIN_CREATION_ROLE_OPTIONS[0].value;
}
