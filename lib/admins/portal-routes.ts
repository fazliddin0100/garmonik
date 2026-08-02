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
  | 'it'
  | 'supply'
  | 'kassa'
  /** Kabinet sahifasi hali yaratilmagan rollar */
  | 'no_portal';

export const PORTAL_UNAVAILABLE_PATH = '/portal-unavailable';

const CLINICAL = new Set(['Bosh shifokor', 'Shifokor']);
const LAB = new Set(['Laboratoriya menejeri', 'Laboratoriya (natijalar)']);
const NURSING = new Set(['Hamshira', 'Bosh hamshira']);
const OFFICE = new Set(['Kabinet']);

const FINANCE = new Set(['Buxgalter', 'Buxgalter / moliya']);
const HR = new Set(['Kadrlar bo‘limi']);
const MARKETING = new Set(['Marketing / PR']);
const RECEPTION = new Set(['Registrator / qabul']);
const IT = new Set(['IT / texnik yordam']);
const SUPPLY = new Set(["Ta'minot va xarid", 'Ta’minot va xarid']);
const KASSA = new Set(['Kassir', 'Kassa']);

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
    s === 'specialist' ||
    s === 'pharmacy' ||
    s === 'kitchen'
  ) {
    return true;
  }
  return (
    s === 'finance' ||
    s === 'hr' ||
    s === 'marketing' ||
    s === 'reception' ||
    s === 'it' ||
    s === 'supply' ||
    s === 'kassa' ||
    s === 'no_portal'
  );
}

/** Apostrof variantlarini olib tashlash (`'`, `‘` U+2018, `’` U+2019, …) */
function foldRoleText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0027\u0060\u00B4\u2018\u2019\u201B\u2032\u02B9\u02BB\u02BC]/g, '')
    .replace(/\s+/g, ' ');
}

/** Mongo `roleLabel` / panel `roleName` → marshrut guruhi (`login` ixtiyoriy — super admin aniqlash) */
export function adminRoleLabelToJwtRouteGroup(
  roleLabel: string | undefined | null,
  login?: string | undefined | null,
): AdminJwtRouteGroup {
  const lg = typeof login === 'string' ? login : '';
  if (lg && isSuperAdminUser(lg, roleLabel)) return 'superadmin';

  const t = typeof roleLabel === 'string' ? roleLabel.trim() : '';
  const folded = foldRoleText(t);
  if (CLINICAL.has(t)) return 'clinical';
  if (LAB.has(t)) return 'laboratory';
  if (NURSING.has(t)) return 'nursing';
  if (OFFICE.has(t)) return 'office';
  if (
    FINANCE.has(t) ||
    folded.includes('buxgalter') ||
    folded.includes('moliya')
  ) {
    return 'finance';
  }
  if (HR.has(t)) return 'hr';
  if (MARKETING.has(t)) return 'marketing';
  if (RECEPTION.has(t)) return 'reception';
  if (IT.has(t)) return 'it';
  if (SUPPLY.has(t) || folded.includes('taminot') || folded.includes('xarid')) {
    return 'supply';
  }
  if (KASSA.has(t) || folded.includes('kassir')) {
    return 'kassa';
  }
  if (folded.includes('farmatsevt')) return 'pharmacy';
  if (folded.includes('oshpaz')) return 'kitchen';
  /** Xo‘jalik / oshxona xodimi — oshxona kabineti */
  if (folded.includes('xojalik')) return 'kitchen';
  if (folded.includes('yurist') || folded.includes('xavfsizlik')) return 'no_portal';
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
    case 'pharmacy':
      return '/farmatsevt';
    case 'kitchen':
      return '/oshxona';
    case 'head_nursing':
      return '/bosh-hamshira';
    case 'specialist':
      return '/mutaxassis';
    case 'finance':
      return '/kassa-admin';
    case 'kassa':
      return '/kassa';
    case 'marketing':
      return '/dashboard?view=reports';
    case 'hr':
      return '/kadrlar';
    case 'reception':
      return '/patients';
    case 'it':
      return '/settings';
    case 'supply':
      return '/taminot';
    case 'superadmin':
      return '/security-center';
    case 'no_portal':
      return PORTAL_UNAVAILABLE_PATH;
    case 'admin_only':
    default:
      return '/dashboard';
  }
}

/** Hisobotlar (dashboard) uchun ruxsat */
export function adminCanAccessReportsRoute(rg: AdminJwtRouteGroup): boolean {
  return rg === 'admin_only' || rg === 'marketing';
}

/** Rolega mos "hisobot" tugmasi bosilganda ochiladigan sahifa */
export function adminReportsPathForRouteGroup(rg: AdminJwtRouteGroup): string {
  if (rg === 'clinical' || rg === 'laboratory' || rg === 'nursing' || rg === 'office' || rg === 'specialist') {
    return `${staffGroupBasePath(rg)}/hisobotlar`;
  }
  return '/dashboard?view=reports';
}

/**
 * `ADMIN_ONLY_PREFIXES` ostidagi yo‘l uchun ruxsat etilgan admin `routeGroup` ro‘yxati.
 */
export function adminRouteGroupsAllowedForPath(pathname: string): AdminJwtRouteGroup[] {
  if (pathUnderAdminPrefix(pathname, PORTAL_UNAVAILABLE_PATH)) {
    return [
      'no_portal',
      'admin_only',
      'kitchen',
      'pharmacy',
      'finance',
      'hr',
      'marketing',
      'reception',
      'it',
      'supply',
      'kassa',
    ];
  }
  if (pathUnderAdminPrefix(pathname, '/dashboard')) {
    return ['admin_only', 'marketing'];
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
  if (pathUnderAdminPrefix(pathname, '/taminot')) {
    return ['admin_only', 'supply'];
  }
  if (pathUnderAdminPrefix(pathname, '/kassa-admin')) {
    return ['admin_only', 'finance'];
  }
  if (
    pathUnderAdminPrefix(pathname, '/kassir') ||
    pathUnderAdminPrefix(pathname, '/kassa')
  ) {
    return ['admin_only', 'kassa'];
  }
  return ['admin_only'];
}

/** Cheklangan admin uchun sidebar: faqat shu linklar */
export function adminRestrictedNavLinks(
  rg: AdminJwtRouteGroup,
): { href: string; label: string }[] {
  switch (rg) {
    case 'finance':
      return [{ href: '/kassa-admin', label: 'Buxgalter (kassa)' }];
    case 'kassa':
      return [{ href: '/kassa', label: 'Kassa' }];
    case 'marketing':
      return [{ href: '/dashboard?view=reports', label: 'Hisobotlar' }];
    case 'hr':
      return [{ href: '/kadrlar', label: 'Kadrlar bo‘limi' }];
    case 'reception':
      return [
        { href: '/patients', label: 'Bemorlar' },
        { href: '/appointments', label: 'Navbat' },
      ];
    case 'it':
      return [{ href: '/settings', label: 'Sozlamalar' }];
    case 'supply':
      return [{ href: '/taminot', label: "Ta'minot va xarid" }];
    case 'kitchen':
      return [{ href: '/oshxona', label: 'Oshxona' }];
    case 'no_portal':
      return [{ href: PORTAL_UNAVAILABLE_PATH, label: 'Kabinet' }];
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
    rg === 'it' ||
    rg === 'supply' ||
    rg === 'kassa' ||
    rg === 'kitchen' ||
    rg === 'no_portal'
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

  if (rg === 'supply') {
    return (
      key === 'supply-orders' ||
      key === 'supply-purchases' ||
      key === 'pharmacy-products' ||
      key === 'kitchen-products'
    );
  }

  if (rg === 'kitchen') {
    return key === 'kitchen-products' || key === 'supply-orders';
  }

  if (rg === 'pharmacy') {
    return key === 'pharmacy-products' || key === 'supply-orders';
  }

  if (rg === 'no_portal') return false;

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
    case 'pharmacy':
      return '/farmatsevt';
    case 'kitchen':
      return '/oshxona';
  }
}
