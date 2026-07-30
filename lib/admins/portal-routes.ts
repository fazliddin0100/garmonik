import type { StaffRouteGroup } from '@/lib/auth/constants';
import { isSuperAdminUser } from '@/lib/auth/superadmin';
import type { ClinicResourceKey } from '@/lib/clinic-data/keys';

/** Xodim kabineti + cheklangan admin kabinetlari (JWT `rg`) */
export type AdminJwtRouteGroup =
  | 'superadmin'
  | 'admin_only'
  | StaffRouteGroup
  | 'finance'
  | 'hr'
  | 'marketing'
  | 'reception'
  | 'it';

const CLINICAL = new Set(['Bosh shifokor', 'Shifokor']);
const LAB = new Set(['Laboratoriya menejeri', 'Laboratoriya (natijalar)']);
const NURSING = new Set(['Hamshira', 'Bosh hamshira']);
const OFFICE = new Set(['Kabinet']);

const FINANCE = new Set(['Buxgalter / moliya']);
const HR = new Set(['Kadrlar bo‘limi']);
const MARKETING = new Set(['Marketing / PR']);
const RECEPTION = new Set(['Registrator / qabul']);
const IT = new Set(['IT / texnik yordam']);

export function pathUnderAdminPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAdminJwtRouteGroup(s: string): s is AdminJwtRouteGroup {
  if (s === 'superadmin') return true;
  if (s === 'admin_only') return true;
  if (
    s === 'clinical' ||
    s === 'laboratory' ||
    s === 'nursing' ||
    s === 'office' ||
    s === 'head_nursing' ||
    s === 'specialist'
  ) {
    return true;
  }
  return (
    s === 'finance' ||
    s === 'hr' ||
    s === 'marketing' ||
    s === 'reception' ||
    s === 'it'
  );
}

/** Mongo `roleLabel` / panel `roleName` → marshrut guruhi (`login` ixtiyoriy — super admin aniqlash) */
export function adminRoleLabelToJwtRouteGroup(
  roleLabel: string | undefined | null,
  login?: string | undefined | null,
): AdminJwtRouteGroup {
  const lg = typeof login === 'string' ? login : '';
  if (lg && isSuperAdminUser(lg, roleLabel)) return 'superadmin';

  const t = typeof roleLabel === 'string' ? roleLabel.trim() : '';
  if (CLINICAL.has(t)) return 'clinical';
  if (LAB.has(t)) return 'laboratory';
  if (NURSING.has(t)) return 'nursing';
  if (OFFICE.has(t)) return 'office';
  if (FINANCE.has(t)) return 'finance';
  if (HR.has(t)) return 'hr';
  if (MARKETING.has(t)) return 'marketing';
  if (RECEPTION.has(t)) return 'reception';
  if (IT.has(t)) return 'it';
  return 'admin_only';
}

/** Kirishdan keyin bosh sahifa */
export function adminHomePathForRouteGroup(rg: AdminJwtRouteGroup): string {
  switch (rg) {
    case 'clinical':
      return '/doctor';
    case 'laboratory':
      return '/labaratoriya';
    case 'nursing':
      return '/hamshiralar';
    case 'office':
      return '/kabinet';
    case 'finance':
    case 'marketing':
      return '/reports';
    case 'hr':
      return '/kadrlar';
    case 'reception':
      return '/patients';
    case 'it':
      return '/settings';
    case 'superadmin':
      return '/security-center';
    case 'admin_only':
    default:
      return '/dashboard';
  }
}

/** `/reports` uchun ruxsat (moliyachi, marketing, shifokor kabineti adminlari va h.k.) */
export function adminCanAccessReportsRoute(rg: AdminJwtRouteGroup): boolean {
  return (
    rg === 'admin_only' ||
    rg === 'finance' ||
    rg === 'marketing'
  );
}

/** Rolega mos "hisobot" tugmasi bosilganda ochiladigan sahifa */
export function adminReportsPathForRouteGroup(rg: AdminJwtRouteGroup): string {
  if (rg === 'clinical' || rg === 'laboratory' || rg === 'nursing' || rg === 'office' || rg === 'specialist') {
    return `${staffGroupBasePath(rg)}/hisobotlar`;
  }
  return '/reports';
}

/**
 * `ADMIN_ONLY_PREFIXES` ostidagi yo‘l uchun ruxsat etilgan admin `routeGroup` ro‘yxati.
 */
export function adminRouteGroupsAllowedForPath(pathname: string): AdminJwtRouteGroup[] {
  if (pathUnderAdminPrefix(pathname, '/dashboard')) {
    return ['admin_only'];
  }
  if (pathUnderAdminPrefix(pathname, '/security-center')) {
    return ['superadmin'];
  }
  if (pathUnderAdminPrefix(pathname, '/users')) {
    return ['admin_only'];
  }
  if (pathUnderAdminPrefix(pathname, '/kadrlar')) {
    return ['admin_only', 'hr'];
  }
  if (pathUnderAdminPrefix(pathname, '/patients')) {
    return ['admin_only', 'reception'];
  }
  if (pathUnderAdminPrefix(pathname, '/appointments')) {
    return ['admin_only', 'reception'];
  }
  if (pathUnderAdminPrefix(pathname, '/services')) {
    return ['admin_only'];
  }
  if (pathUnderAdminPrefix(pathname, '/settings')) {
    return ['admin_only', 'it'];
  }
  return ['admin_only'];
}

/** Cheklangan admin uchun sidebar: faqat shu linklar */
export function adminRestrictedNavLinks(
  rg: AdminJwtRouteGroup,
): { href: string; label: string }[] {
  switch (rg) {
    case 'finance':
    case 'marketing':
      return [{ href: '/reports', label: 'Hisobotlar' }];
    case 'hr':
      return [{ href: '/kadrlar', label: 'Kadrlar bo‘limi' }];
    case 'reception':
      return [
        { href: '/patients', label: 'Bemorlar' },
        { href: '/appointments', label: 'Navbat' },
      ];
    case 'it':
      return [{ href: '/settings', label: 'Sozlamalar' }];
    default:
      return [];
  }
}

export function adminUsesRestrictedShell(rg: AdminJwtRouteGroup): boolean {
  return (
    rg === 'finance' ||
    rg === 'hr' ||
    rg === 'marketing' ||
    rg === 'reception' ||
    rg === 'it'
  );
}

/**
 * Clinic resource API (`/api/clinic-data/[key]`) uchun admin darajasidagi cheklov.
 * Maqsad: rolega mos bo'lmagan ma'lumotlar o'qilishi/yozilishini server tomonda ham to'xtatish.
 */
export function adminCanAccessClinicResource(
  rg: AdminJwtRouteGroup,
  key: ClinicResourceKey,
  method: 'GET' | 'PUT',
): boolean {
  if (rg === 'superadmin') return false;
  if (rg === 'admin_only') return true;

  // PUT faqat to'liq klinika admini uchun (cheklangan rollar pastda)
  if (method === 'PUT') return false;

  if (rg === 'finance' || rg === 'marketing') {
    return (
      key === 'contracts' ||
      key === 'service-prices' ||
      key === 'patients' ||
      key === 'pharmacy-products'
    );
  }

  if (rg === 'hr') return key === 'patients';
  if (rg === 'reception') return key === 'patients' || key === 'queue';
  if (rg === 'it') return key === 'clinic-settings';

  // clinical / laboratory / nursing / office adminlar staff kabinetidagi o'z qoidalariga o'tadi
  if (rg === 'clinical' || rg === 'nursing' || rg === 'office') {
    return (
      key === 'patients' ||
      key === 'queue' ||
      key === 'service-prices'
    );
  }
  if (rg === 'laboratory') {
    return (
      key === 'patients' ||
      key === 'queue' ||
      key === 'service-prices' ||
      key === 'lab-catalog'
    );
  }
  if (rg === 'specialist') {
    return key === 'patients';
  }

  return false;
}

/** Marshrut guruhi → kabinet URL prefiksi (xodim kabineti) */
export function staffGroupBasePath(group: StaffRouteGroup): string {
  switch (group) {
    case 'clinical':
      return '/doctor';
    case 'laboratory':
      return '/labaratoriya';
    case 'nursing':
      return '/hamshiralar';
    case 'head_nursing':
      return '/bosh-hamshira';
    case 'office':
      return '/kabinet';
    case 'specialist':
      return '/mutaxassis';
  }
}
