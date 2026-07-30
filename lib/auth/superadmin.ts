/**
 * Super admin akkauntlari (seed: roleLabel "Super administrator").
 * Login ro‘yxati env orqali kengaytirilishi mumkin.
 */

function normalizeLabel(s: string | undefined | null): string {
  return (typeof s === 'string' ? s : '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Seed (`scripts/seed.ts`) bilan mos kelishi shart */
const SUPER_ADMIN_ROLE_LABEL = 'super administrator';

export function configuredSuperAdminLogins(): string[] {
  const rawConfigured = process.env.SUPER_ADMIN_LOGINS || '';
  const seedSuper = process.env.SEED_SUPER_ADMIN_LOGIN || '';
  const seedPrimaryEmail = process.env.SEED_PRIMARY_ADMIN_EMAIL || '';

  return [rawConfigured, seedSuper, seedPrimaryEmail, 'superadmin']
    .join(',')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function loginMatchesConfigured(login: string): boolean {
  const t = login.trim().toLowerCase();
  return configuredSuperAdminLogins().some((c) => c === t);
}

export function isSuperAdminUser(
  login: string,
  roleLabel?: string | null,
): boolean {
  if (loginMatchesConfigured(login)) return true;
  return normalizeLabel(roleLabel) === SUPER_ADMIN_ROLE_LABEL;
}

export const SUPERADMIN_LOGIN_REDIRECT = '/security-center' as const;
