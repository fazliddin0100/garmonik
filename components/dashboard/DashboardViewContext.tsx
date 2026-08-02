'use client';

import {
  DASHBOARD_INITIAL_VIEW_KEY,
  DASHBOARD_VIEW_META,
  type DashboardViewId,
  dashboardViewFromSearchParam,
  dashboardViewPath,
  peekDashboardInitialView,
} from '@/lib/dashboard/views';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  Suspense,
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

function DashboardViewProviderInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const onDashboard = pathname === '/dashboard';
  const viewParam = searchParams.get('view');

  const [view, setViewState] = useState<DashboardViewId>(() => {
    return (
      dashboardViewFromSearchParam(viewParam) ||
      peekDashboardInitialView() ||
      'overview'
    );
  });

  useEffect(() => {
    if (!onDashboard) return;
    const fromQuery = dashboardViewFromSearchParam(viewParam);
    if (fromQuery) {
      setViewState(fromQuery);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(DASHBOARD_INITIAL_VIEW_KEY);
      }
      return;
    }
    const pending = peekDashboardInitialView();
    if (pending) {
      setViewState(pending);
      sessionStorage.removeItem(DASHBOARD_INITIAL_VIEW_KEY);
    }
  }, [onDashboard, viewParam]);

  const setView = useCallback(
    (next: DashboardViewId) => {
      setViewState(next);
      if (onDashboard) {
        router.replace(dashboardViewPath(next));
      }
    },
    [onDashboard, router],
  );

  const openView = useCallback(
    (next: DashboardViewId) => {
      setViewState(next);
      router.push(dashboardViewPath(next));
    },
    [router],
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

export function DashboardViewProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardViewProviderInner>{children}</DashboardViewProviderInner>
    </Suspense>
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
