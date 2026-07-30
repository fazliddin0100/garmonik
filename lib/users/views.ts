export type UsersViewId =
  | 'hub'
  | 'admins'
  | 'doctors'
  | 'nurses'
  | 'laboratory'
  | 'reception'
  | 'pharmacists'
  | 'staff';

export const USERS_VIEW_META: Record<UsersViewId, { title: string; legacyPath: string }> =
  {
    hub: { title: 'Xodimlar', legacyPath: '/users' },
    admins: { title: 'Administratorlar', legacyPath: '/users/admins' },
    doctors: { title: 'Shifokorlar', legacyPath: '/users/doctors' },
    nurses: { title: 'Hamshiralar', legacyPath: '/users/nurses' },
    laboratory: {
      title: 'Laboratoriya xodimlari',
      legacyPath: '/users/laboratory',
    },
    reception: { title: 'Qabul xodimlari', legacyPath: '/users/reception' },
    pharmacists: { title: 'Farmatsevtlar', legacyPath: '/users/pharmacists' },
    staff: { title: 'Klinika xodimlari', legacyPath: '/users/staff' },
  };

export const usersSubNavItems = (
  [
    'admins',
    'doctors',
    'nurses',
    'laboratory',
    'reception',
    'pharmacists',
    'staff',
  ] as const
).map((view) => ({
  view,
  label: USERS_VIEW_META[view].title,
}));

const LEGACY_PATH_TO_VIEW = new Map<string, UsersViewId>(
  Object.entries(USERS_VIEW_META).map(([view, meta]) => [
    meta.legacyPath,
    view as UsersViewId,
  ]),
);

export function isUsersViewId(value: string): value is UsersViewId {
  return value in USERS_VIEW_META;
}

export function usersViewFromLegacyPath(path: string): UsersViewId | null {
  const normalized =
    path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
  return LEGACY_PATH_TO_VIEW.get(normalized) ?? null;
}

export function persistUsersInitialView(view: UsersViewId) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('garmonik-portal-initial-users-view', view);
}

export function consumeUsersInitialView(): UsersViewId | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('garmonik-portal-initial-users-view');
  sessionStorage.removeItem('garmonik-portal-initial-users-view');
  if (!raw || !isUsersViewId(raw)) return null;
  return raw;
}
