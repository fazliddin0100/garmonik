import type { AdminJwtRouteGroup } from '@/lib/admins/portal-routes';

export type PortalMainSectionId =
  | 'users'
  | 'patients'
  | 'appointments'
  | 'services'
  | 'reports'
  | 'settings';

export const PORTAL_SHELL_PATHS = [
  '/users',
  '/patients',
  '/appointments',
  '/services',
  '/reports',
  '/settings',
] as const;

export type PortalGateConfig = {
  allowedAdminRouteGroups?: readonly AdminJwtRouteGroup[];
  deniedAdminRouteGroups?: readonly AdminJwtRouteGroup[];
};

export const PORTAL_SECTION_META: Record<
  PortalMainSectionId,
  { title: string; gate: PortalGateConfig }
> = {
  users: { title: 'Xodimlar', gate: {} },
  patients: {
    title: 'Bemorlar',
    gate: { allowedAdminRouteGroups: ['admin_only', 'reception'] },
  },
  appointments: {
    title: 'Navbat',
    gate: { allowedAdminRouteGroups: ['admin_only', 'reception'] },
  },
  services: { title: 'Xizmatlar', gate: {} },
  reports: {
    title: 'Hisobotlar',
    gate: { deniedAdminRouteGroups: ['hr', 'reception', 'it'] },
  },
  settings: {
    title: 'Sozlamalar',
    gate: { allowedAdminRouteGroups: ['admin_only', 'it'] },
  },
};

export function isPortalShellPath(pathname: string): boolean {
  return PORTAL_SHELL_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function mainSectionFromPath(pathname: string): PortalMainSectionId | null {
  if (pathname === '/users' || pathname.startsWith('/users/')) return 'users';
  if (pathname === '/patients' || pathname.startsWith('/patients/')) {
    return 'patients';
  }
  if (pathname === '/appointments' || pathname.startsWith('/appointments/')) {
    return 'appointments';
  }
  if (pathname === '/services' || pathname.startsWith('/services/')) {
    return 'services';
  }
  if (pathname === '/reports' || pathname.startsWith('/reports/')) {
    return 'reports';
  }
  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    return 'settings';
  }
  return null;
}

export const PORTAL_INITIAL_SECTION_KEY = 'garmonik-portal-initial-section';
export const PORTAL_INITIAL_USERS_VIEW_KEY = 'garmonik-portal-initial-users-view';

export function persistPortalInitialSection(section: PortalMainSectionId) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PORTAL_INITIAL_SECTION_KEY, section);
}

export const PORTAL_SECTION_ENTRY_PATH: Record<PortalMainSectionId, string> = {
  users: '/users',
  patients: '/patients',
  appointments: '/appointments',
  services: '/services',
  reports: '/reports',
  settings: '/settings',
};

export function consumePortalInitialSection(): PortalMainSectionId | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PORTAL_INITIAL_SECTION_KEY);
  sessionStorage.removeItem(PORTAL_INITIAL_SECTION_KEY);
  if (!raw) return null;
  return raw in PORTAL_SECTION_META ? (raw as PortalMainSectionId) : null;
}
