'use client';

import {
  DASHBOARD_VIEW_META,
  type DashboardViewId,
  consumeDashboardInitialView,
} from '@/lib/dashboard/views';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type DashboardViewContextValue = {
  view: DashboardViewId;
  title: string;
  setView: (view: DashboardViewId) => void;
  openView: (view: DashboardViewId) => void;
};

const DashboardViewContext = createContext<DashboardViewContextValue | null>(
  null,
);

export function DashboardViewProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const onDashboard = pathname === '/dashboard';

  const [view, setViewState] = useState<DashboardViewId>('overview');

  useEffect(() => {
    if (!onDashboard) return;
    const initial = consumeDashboardInitialView();
    if (initial) {
      setViewState(initial);
    }
  }, [onDashboard]);

  const setView = useCallback((next: DashboardViewId) => {
    setViewState(next);
  }, []);

  const openView = useCallback(
    (next: DashboardViewId) => {
      setViewState(next);
      if (pathname !== '/dashboard') {
        router.push('/dashboard');
      }
    },
    [pathname, router],
  );

  const title = DASHBOARD_VIEW_META[view].title;

  const value = useMemo(
    () => ({ view, title, setView, openView }),
    [view, title, setView, openView],
  );

  return (
    <DashboardViewContext.Provider value={value}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export function useDashboardView() {
  const ctx = useContext(DashboardViewContext);
  if (!ctx) {
    throw new Error('useDashboardView must be used within DashboardViewProvider');
  }
  return ctx;
}

export function useDashboardViewOptional() {
  return useContext(DashboardViewContext);
}
