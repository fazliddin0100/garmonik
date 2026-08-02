export type DashboardViewId =
  | 'overview'
  | 'departments'
  | 'rooms'
  | 'service-types'
  | 'products'
  | 'partners'
  | 'contracts'
  | 'reports';

export const DASHBOARD_INITIAL_VIEW_KEY = 'garmonik-dashboard-initial-view';

export type DashboardSubNavItem = {
  view: DashboardViewId;
  label: string;
};

export const DASHBOARD_VIEW_META: Record<
  DashboardViewId,
  { title: string; legacyPath: string }
> = {
  overview: { title: 'Dashboard', legacyPath: '/dashboard' },
  departments: {
    title: "Bo'limlar ro'yxati",
    legacyPath: '/dashboard/departments',
  },
  rooms: { title: 'Xonalar', legacyPath: '/dashboard/rooms' },
  'service-types': {
    title: 'Xizmat turlari',
    legacyPath: '/dashboard/service-types',
  },
  products: { title: 'Mahsulotlar', legacyPath: '/dashboard/products' },
  partners: { title: 'Hamkorlar', legacyPath: '/dashboard/partners' },
  contracts: { title: 'Shartnomalar', legacyPath: '/dashboard/contracts' },
  reports: {
    title: 'Hisobotlar',
    legacyPath: '/dashboard/reports',
  },
};

export const dashboardSubNavItems: {
  view: DashboardViewId;
  label: string;
}[] = (
  [
    'departments',
    'rooms',
    'service-types',
    'products',
    'partners',
    'contracts',
    'reports',
  ] as const
).map((view) => ({
  view,
  label: DASHBOARD_VIEW_META[view].title,
}));

const LEGACY_PATH_TO_VIEW = new Map<string, DashboardViewId>(
  Object.entries(DASHBOARD_VIEW_META).map(([view, meta]) => [
    meta.legacyPath,
    view as DashboardViewId,
  ]),
);

export function isDashboardViewId(value: string): value is DashboardViewId {
  return value in DASHBOARD_VIEW_META;
}

export function dashboardViewFromLegacyPath(
  path: string,
): DashboardViewId | null {
  const normalized =
    path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return LEGACY_PATH_TO_VIEW.get(normalized) ?? null;
}

export function dashboardViewPath(view: DashboardViewId): string {
  if (view === 'overview') return '/dashboard';
  return `/dashboard?view=${encodeURIComponent(view)}`;
}

export function dashboardViewFromSearchParam(
  value: string | null | undefined,
): DashboardViewId | null {
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  return isDashboardViewId(decoded) ? decoded : null;
}

export function persistDashboardInitialView(view: DashboardViewId) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DASHBOARD_INITIAL_VIEW_KEY, view);
}

export function peekDashboardInitialView(): DashboardViewId | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(DASHBOARD_INITIAL_VIEW_KEY);
  if (!raw || !isDashboardViewId(raw)) return null;
  return raw;
}

export function consumeDashboardInitialView(): DashboardViewId | null {
  const view = peekDashboardInitialView();
  if (!view || typeof window === 'undefined') return view;
  sessionStorage.removeItem(DASHBOARD_INITIAL_VIEW_KEY);
  return view;
}
