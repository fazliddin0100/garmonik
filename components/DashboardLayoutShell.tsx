'use client';

import DashboardMobileNav from '@/components/DashboardMobileNav';
import { DashboardViewProvider, useDashboardViewOptional } from '@/components/dashboard/DashboardViewContext';
import {
  PortalNavProvider,
  usePortalNavOptional,
} from '@/components/portal/PortalNavContext';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import {
  isPortalShellPath,
  PORTAL_SECTION_META,
} from '@/lib/portal/sections';
import { USERS_VIEW_META } from '@/lib/users/views';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type DashboardLayoutShellProps = {
  title: string;
  children: ReactNode;
};

function DashboardLayoutInner({
  title,
  children,
}: DashboardLayoutShellProps) {
  const pathname = usePathname();
  const dashboardView = useDashboardViewOptional();
  const portalNav = usePortalNavOptional();

  const displayTitle = (() => {
    if (pathname === '/dashboard' && dashboardView) return dashboardView.title;
    if (portalNav && isPortalShellPath(pathname)) {
      if (portalNav.mainSection === 'users') {
        return USERS_VIEW_META[portalNav.usersView].title;
      }
      return PORTAL_SECTION_META[portalNav.mainSection].title;
    }
    return title;
  })();

  return (
    <div className="relative flex h-dvh w-full min-w-0 overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
      <Sidebar />
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col md:pl-45">
        <header className="fixed top-0 right-0 left-0 z-50 shrink-0 md:left-45">
          <TopBar title={displayTitle} />
          <DashboardMobileNav />
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pb-4 pt-[7.25rem] sm:px-4 md:p-6 md:pt-20">
          <div className="mx-auto w-full min-w-0 max-w-[1920px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayoutShell(props: DashboardLayoutShellProps) {
  return (
    <PortalNavProvider>
      <DashboardViewProvider>
        <DashboardLayoutInner {...props} />
      </DashboardViewProvider>
    </PortalNavProvider>
  );
}
