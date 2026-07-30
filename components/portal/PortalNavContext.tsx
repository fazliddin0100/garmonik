'use client';

import {
  consumePortalInitialSection,
  isPortalShellPath,
  mainSectionFromPath,
  PORTAL_SECTION_ENTRY_PATH,
  type PortalMainSectionId,
} from '@/lib/portal/sections';
import {
  consumeUsersInitialView,
  usersViewFromLegacyPath,
  type UsersViewId,
} from '@/lib/users/views';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
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

function resolveUsersView(pathname: string): UsersViewId {
  return usersViewFromLegacyPath(pathname) ?? 'hub';
}

export function PortalNavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onPortalShell = isPortalShellPath(pathname);

  const [mainSection, setMainSectionState] = useState<PortalMainSectionId>(
    () => mainSectionFromPath(pathname) ?? 'patients',
  );
  const [usersView, setUsersViewState] = useState<UsersViewId>(() =>
    resolveUsersView(pathname),
  );

  useEffect(() => {
    if (!onPortalShell) return;
    const fromPath = mainSectionFromPath(pathname);
    if (fromPath) setMainSectionState(fromPath);
    if (fromPath === 'users' || pathname.startsWith('/users')) {
      setUsersViewState(resolveUsersView(pathname));
    }
  }, [pathname, onPortalShell]);

  useEffect(() => {
    if (!onPortalShell) return;
    const initialSection = consumePortalInitialSection();
    if (initialSection) setMainSectionState(initialSection);
    const initialUsersView = consumeUsersInitialView();
    if (initialUsersView) {
      setMainSectionState('users');
      setUsersViewState(initialUsersView);
    }
  }, [onPortalShell]);

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
      if (isPortalShellPath(pathname)) return;
      router.push('/users');
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
