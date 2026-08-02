'use client';

import {
  consumePortalInitialSection,
  isPortalShellPath,
  mainSectionFromPath,
  PORTAL_SECTION_ENTRY_PATH,
  type PortalMainSectionId,
} from '@/lib/portal/sections';
import {
  peekUsersInitialView,
  usersViewFromLegacyPath,
  usersViewFromSearchParam,
  usersViewPath,
  type UsersViewId,
} from '@/lib/users/views';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type PortalNavContextValue = {
  mainSection: PortalMainSectionId;
  usersView: UsersViewId;
  setMainSection: (section: PortalMainSectionId) => void;
  setUsersView: (view: UsersViewId) => void;
  openMainSection: (section: PortalMainSectionId) => void;
  openUsersView: (view: UsersViewId) => void;
  onPortalShell: boolean;
};

const PortalNavContext = createContext<PortalNavContextValue | null>(null);

function resolveUsersView(
  pathname: string,
  viewParam: string | null,
): UsersViewId {
  const fromQuery = usersViewFromSearchParam(viewParam);
  if (fromQuery) return fromQuery;
  const pending = peekUsersInitialView();
  if (pending && (pathname === '/users' || pathname.startsWith('/users/'))) {
    return pending;
  }
  return usersViewFromLegacyPath(pathname) ?? 'hub';
}

function PortalNavProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view');
  const onPortalShell = isPortalShellPath(pathname);

  const [mainSection, setMainSectionState] = useState<PortalMainSectionId>(
    () => mainSectionFromPath(pathname) ?? 'patients',
  );
  const [usersView, setUsersViewState] = useState<UsersViewId>(() =>
    resolveUsersView(pathname, viewParam),
  );

  useEffect(() => {
    if (!onPortalShell) return;
    const fromPath = mainSectionFromPath(pathname);
    if (fromPath) setMainSectionState(fromPath);
    if (fromPath === 'users' || pathname.startsWith('/users')) {
      const nextView = resolveUsersView(pathname, viewParam);
      setUsersViewState(nextView);
      // Clear one-shot session hint after URL/query has taken over.
      if (
        typeof window !== 'undefined' &&
        (viewParam || nextView !== 'hub')
      ) {
        const pending = peekUsersInitialView();
        if (pending && pending === nextView) {
          sessionStorage.removeItem('garmonik-portal-initial-users-view');
        }
      }
    }
  }, [pathname, onPortalShell, viewParam]);

  useEffect(() => {
    if (!onPortalShell) return;
    const initialSection = consumePortalInitialSection();
    if (initialSection) setMainSectionState(initialSection);
    const pending = peekUsersInitialView();
    if (pending && !usersViewFromSearchParam(viewParam)) {
      setMainSectionState('users');
      setUsersViewState(pending);
    }
  }, [onPortalShell, viewParam]);

  const setMainSection = useCallback((section: PortalMainSectionId) => {
    setMainSectionState(section);
  }, []);

  const setUsersView = useCallback((view: UsersViewId) => {
    setUsersViewState(view);
  }, []);

  const openMainSection = useCallback(
    (section: PortalMainSectionId) => {
      setMainSectionState(section);
      if (isPortalShellPath(pathname)) return;
      router.push(PORTAL_SECTION_ENTRY_PATH[section]);
    },
    [pathname, router],
  );

  const openUsersView = useCallback(
    (view: UsersViewId) => {
      setMainSectionState('users');
      setUsersViewState(view);
      if (isPortalShellPath(pathname)) {
        router.replace(usersViewPath(view));
        return;
      }
      router.push(usersViewPath(view));
    },
    [pathname, router],
  );

  const value = useMemo(
    () => ({
      mainSection,
      usersView,
      setMainSection,
      setUsersView,
      openMainSection,
      openUsersView,
      onPortalShell,
    }),
    [
      mainSection,
      usersView,
      setMainSection,
      setUsersView,
      openMainSection,
      openUsersView,
      onPortalShell,
    ],
  );

  return (
    <PortalNavContext.Provider value={value}>{children}</PortalNavContext.Provider>
  );
}

export function PortalNavProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PortalNavProviderInner>{children}</PortalNavProviderInner>
    </Suspense>
  );
}

export function usePortalNav() {
  const ctx = useContext(PortalNavContext);
  if (!ctx) {
    throw new Error('usePortalNav must be used within PortalNavProvider');
  }
  return ctx;
}

export function usePortalNavOptional() {
  return useContext(PortalNavContext);
}
