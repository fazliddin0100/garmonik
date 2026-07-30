'use client';

import RoleAwareUserMenu from '@/components/auth/RoleAwareUserMenu';
import {
  adminHomePathForRouteGroup,
  staffGroupBasePath,
} from '@/lib/admins/portal-routes';
import type { StaffRouteGroup } from '@/lib/auth/constants';
import { staffHomePath } from '@/lib/staff-portal/auth';
import {
  isStaffRole,
  STAFF_ROLE_LABELS,
  type StaffRole,
} from '@/lib/staff-portal/types';
import {
  Building2,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FlaskConical,
  HeartPulse,
  Home,
  Microscope,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  StaffPortalViewProvider,
  useStaffPortalViewOptional,
} from '@/components/staff/StaffPortalViewContext';
import type { StaffPortalPatientsMode } from '@/components/staff/StaffPortalViewContext';
import {
  STAFF_PORTAL_VIEW_META,
  type StaffPortalViewId,
} from '@/lib/staff-portal/views';
import OnlineNavbatCountBadge from '@/components/appointment-requests/OnlineNavbatCountBadge';
import { useNewOnlineQueueCount } from '@/hooks/useNewOnlineQueueCount';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

const staffRoleIcon: Record<StaffRole, LucideIcon> = {
  doctor: Stethoscope,
  shifokor: Stethoscope,
  laboratory: Microscope,
  nurse: HeartPulse,
  head_nurse: HeartPulse,
  kabinet: Building2,
  specialist: Stethoscope,
};

const groupIcon: Record<StaffRouteGroup, LucideIcon> = {
  clinical: Stethoscope,
  laboratory: Microscope,
  nursing: HeartPulse,
  head_nursing: HeartPulse,
  office: Building2,
  specialist: Stethoscope,
};

type MeStaff = {
  kind: 'staff';
  id: string;
  role: StaffRole;
  login: string;
  fullName: string;
};

type MeAdminPortal = {
  kind: 'admin_portal';
  login: string;
  fullName: string;
  roleLabel: string;
  routeGroup: StaffRouteGroup;
  basePath: string;
};

type PortalSession = MeStaff | MeAdminPortal;

type StaffPortalLayoutProps = {
  /** Ushbu marshrutlar guruhi uchun ruxsat etilgan xodim rollari */
  allowedRoles: readonly StaffRole[];
  /**
   * Mongo admin (`AdminUser`) ushbu kabinetga kirishi: JWT `routeGroup` bilan mos kelishi kerak.
   * Masalan, shifokorlar uchun `clinical`.
   */
  allowAdminRouteGroup?: StaffRouteGroup;
  title: string;
  showPatientsNav?: boolean;
  showServicesNav?: boolean;
  /** Navbat bo‘limi (laboratoriya kabinetida o‘chiriladi) */
  showQueueNav?: boolean;
  /** Birinchi ochiladigan bo‘lim */
  defaultView?: StaffPortalViewId;
  /** `/doctor` kabi — bo‘limlar URL emas, state orqali almashadi */
  shellBasePath?: string;
  patientsMode?: StaffPortalPatientsMode;
  /** Navbat menyusida yangi onlayn arizalar soni */
  showOnlineNavbatBadge?: boolean;
  /** Kabinet: Hisobotlar o‘rniga Kartalar bo‘limi */
  showCardsNav?: boolean;
  children: ReactNode;
};

function staffPortalTrailingNavItems(
  showCardsNav: boolean,
): { view: StaffPortalViewId; label: string; icon: LucideIcon }[] {
  if (showCardsNav) {
    return [{ view: 'kartalar', label: 'Kartalar', icon: CreditCard }];
  }
  return [{ view: 'hisobotlar', label: 'Hisobotlar', icon: FileBarChart2 }];
}

function staffPortalMobileTrailingNavItems(
  showCardsNav: boolean,
): { view: StaffPortalViewId; label: string; icon: LucideIcon }[] {
  if (showCardsNav) {
    return [{ view: 'kartalar', label: 'Kartalar', icon: CreditCard }];
  }
  return [{ view: 'hisobotlar', label: 'Hisobot', icon: FileBarChart2 }];
}

function StaffPortalNavItems({
  base,
  isLab,
  showPatientsNav,
  showServicesNav,
  showQueueNav = true,
  showOnlineNavbatBadge = false,
  showCardsNav = false,
}: {
  base: string;
  isLab: boolean;
  showPatientsNav: boolean;
  showServicesNav: boolean;
  showQueueNav?: boolean;
  showOnlineNavbatBadge?: boolean;
  showCardsNav?: boolean;
}) {
  const pathname = usePathname();
  const portalNav = useStaffPortalViewOptional();
  const newOnlineCount = useNewOnlineQueueCount(showOnlineNavbatBadge);

  const items: { view: StaffPortalViewId; label: string; icon: LucideIcon }[] = [
    { view: 'home', label: 'Bosh sahifa', icon: Home },
    ...(showPatientsNav ?
      [{ view: 'bemorlar' as const, label: 'Bemorlar', icon: UserRound }]
    : []),
    ...(showQueueNav ?
      [{ view: 'navbat' as const, label: 'Navbat', icon: ClipboardList }]
    : []),
    ...(showServicesNav ?
      [
        {
          view: 'xizmatlar' as const,
          label: isLab ? 'Tahlillar narxlari' : 'Xizmatlar',
          icon: FlaskConical,
        },
      ]
    : []),
    ...staffPortalTrailingNavItems(showCardsNav),
  ];

  return items.map((item) => {
    const legacyHref = `${base}${STAFF_PORTAL_VIEW_META[item.view].segment ? `/${STAFF_PORTAL_VIEW_META[item.view].segment}` : ''}`;
    const active =
      portalNav ?
        portalNav.view === item.view
      : pathname === legacyHref || pathname.startsWith(`${legacyHref}/`);
    const N = item.icon;
    const className = `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      active ?
        'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
      : 'text-slate-600 hover:bg-white hover:text-slate-900'
    }`;
    const badge =
      item.view === 'navbat' ?
        <OnlineNavbatCountBadge count={newOnlineCount} active={active} />
      : null;

    if (portalNav) {
      return (
        <button
          key={item.view}
          type="button"
          onClick={() => portalNav.openView(item.view)}
          className={`${className} w-full text-left`}>
          <N className="size-4 shrink-0 opacity-90" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {badge}
        </button>
      );
    }

    return (
      <Link key={legacyHref} href={legacyHref} className={className}>
        <N className="size-4 shrink-0 opacity-90" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {badge}
      </Link>
    );
  });
}

function StaffPortalMobileNav({
  base,
  isLab,
  showPatientsNav,
  showServicesNav,
  showQueueNav = true,
  showOnlineNavbatBadge = false,
  showCardsNav = false,
}: {
  base: string;
  isLab: boolean;
  showPatientsNav: boolean;
  showServicesNav: boolean;
  showQueueNav?: boolean;
  showOnlineNavbatBadge?: boolean;
  showCardsNav?: boolean;
}) {
  const pathname = usePathname();
  const portalNav = useStaffPortalViewOptional();
  const newOnlineCount = useNewOnlineQueueCount(showOnlineNavbatBadge);

  const items: { view: StaffPortalViewId; label: string; icon: LucideIcon }[] = [
    { view: 'home', label: 'Bosh', icon: Home },
    ...(showPatientsNav ?
      [{ view: 'bemorlar' as const, label: 'Bemorlar', icon: UserRound }]
    : []),
    ...(showQueueNav ?
      [{ view: 'navbat' as const, label: 'Navbat', icon: ClipboardList }]
    : []),
    ...(showServicesNav ?
      [
        {
          view: 'xizmatlar' as const,
          label: isLab ? 'Tahlil' : 'Xizmat',
          icon: FlaskConical,
        },
      ]
    : []),
    ...staffPortalMobileTrailingNavItems(showCardsNav),
  ];

  return items.map((item) => {
    const legacyHref = `${base}${STAFF_PORTAL_VIEW_META[item.view].segment ? `/${STAFF_PORTAL_VIEW_META[item.view].segment}` : ''}`;
    const active =
      portalNav ?
        portalNav.view === item.view
      : pathname === legacyHref || pathname.startsWith(`${legacyHref}/`);
    const N = item.icon;
    const className = `flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
      active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700'
    }`;
    const badge =
      item.view === 'navbat' ?
        <OnlineNavbatCountBadge
          count={newOnlineCount}
          active={active}
          className="ml-0"
        />
      : null;

    if (portalNav) {
      return (
        <button
          key={item.view}
          type="button"
          onClick={() => portalNav.openView(item.view)}
          className={className}>
          <N className="size-3.5" />
          {item.label}
          {badge}
        </button>
      );
    }

    return (
      <Link key={legacyHref} href={legacyHref} className={className}>
        <N className="size-3.5" />
        {item.label}
        {badge}
      </Link>
    );
  });
}

function StaffPortalShell({
  session,
  title,
  showPatientsNav,
  showServicesNav,
  showQueueNav,
  showOnlineNavbatBadge,
  showCardsNav,
  children,
}: {
  session: PortalSession;
  title: string;
  showPatientsNav: boolean;
  showServicesNav: boolean;
  showQueueNav: boolean;
  showOnlineNavbatBadge: boolean;
  showCardsNav: boolean;
  children: ReactNode;
}) {
  const portalNav = useStaffPortalViewOptional();
  const base =
    session.kind === 'staff' ? staffHomePath(session.role) : session.basePath;
  const NavIcon =
    session.kind === 'staff' ? staffRoleIcon[session.role] : groupIcon[session.routeGroup];
  const isLab =
    session.kind === 'staff' ?
      session.role === 'laboratory'
    : session.routeGroup === 'laboratory';
  const roleLine =
    session.kind === 'staff' ? STAFF_ROLE_LABELS[session.role] : session.roleLabel;
  const portalBadge =
    session.kind === 'staff' ? 'Xodim kabineti' : 'Administrator kabineti';

  return (
    <div className="relative mx-auto flex h-dvh w-full min-w-0 max-w-[1920px] overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-56 min-w-56 shrink-0 flex-col overflow-hidden border-r border-white/60 bg-white/80 backdrop-blur-xl md:flex">
        <div className="shrink-0 border-b border-white/60 px-4 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600/90">
            {portalBadge}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800">{title}</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-900">
            <NavIcon className="size-4 shrink-0" />
            <span className="truncate font-medium">{session.fullName}</span>
          </div>
          <p className="mt-1 px-1 text-[11px] text-slate-500">{roleLine}</p>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-y-contain p-3">
          <StaffPortalNavItems
            base={base}
            isLab={isLab}
            showPatientsNav={showPatientsNav}
            showServicesNav={showServicesNav}
            showQueueNav={showQueueNav}
            showOnlineNavbatBadge={showOnlineNavbatBadge}
            showCardsNav={showCardsNav}
          />
        </nav>
        <div className="shrink-0 border-t border-white/60 p-3" />
      </aside>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:pl-56">
        <header className="z-20 shrink-0 border-b border-white/60 bg-white/85 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Kabinet
              </p>
              <h1 className="text-xl font-bold text-slate-800 md:text-2xl">
                {portalNav && portalNav.view !== 'home' ?
                  portalNav.title
                : title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <RoleAwareUserMenu />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <StaffPortalMobileNav
              base={base}
              isLab={isLab}
              showPatientsNav={showPatientsNav}
              showServicesNav={showServicesNav}
              showQueueNav={showQueueNav}
              showOnlineNavbatBadge={showOnlineNavbatBadge}
              showCardsNav={showCardsNav}
            />
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function StaffPortalLayout({
  allowedRoles,
  allowAdminRouteGroup,
  title,
  showPatientsNav = true,
  showServicesNav = true,
  showQueueNav = true,
  defaultView = 'home',
  shellBasePath,
  patientsMode = 'default',
  showOnlineNavbatBadge = false,
  showCardsNav = false,
  children,
}: StaffPortalLayoutProps) {
  const router = useRouter();
  const [session, setSession] = useState<PortalSession | null>(null);

  const allowedSet = useMemo(() => new Set<StaffRole>(allowedRoles), [allowedRoles]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        const me = await res.json();
        if (cancelled) return;

        if (
          me?.kind === 'staff' &&
          typeof me.role === 'string' &&
          isStaffRole(me.role) &&
          allowedSet.has(me.role)
        ) {
          setSession(me as MeStaff);
          return;
        }

        if (
          allowAdminRouteGroup &&
          me?.kind === 'admin' &&
          me.routeGroup === allowAdminRouteGroup &&
          typeof me.login === 'string' &&
          typeof me.fullName === 'string' &&
          typeof me.roleLabel === 'string'
        ) {
          setSession({
            kind: 'admin_portal',
            login: me.login,
            fullName: me.fullName,
            roleLabel: me.roleLabel,
            routeGroup: allowAdminRouteGroup,
            basePath: staffGroupBasePath(allowAdminRouteGroup),
          });
          return;
        }

        if (me?.kind === 'admin' && typeof me.routeGroup === 'string') {
          router.replace(adminHomePathForRouteGroup(me.routeGroup));
          return;
        }

        router.replace('/auth/login');
      } catch {
        if (!cancelled) router.replace('/auth/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowAdminRouteGroup, allowedSet, router]);

  if (!session) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-slate-100 text-slate-500">
        Yuklanmoqda…
      </div>
    );
  }

  const staffRoleForProvider =
    session.kind === 'staff' ? session.role : null;

  const shell = (
    <StaffPortalShell
      session={session}
      title={title}
      showPatientsNav={showPatientsNav}
      showServicesNav={showServicesNav}
      showQueueNav={showQueueNav}
      showOnlineNavbatBadge={showOnlineNavbatBadge}
      showCardsNav={showCardsNav}>
      {children}
    </StaffPortalShell>
  );

  if (!shellBasePath) {
    return shell;
  }

  return (
    <StaffPortalViewProvider
      basePath={shellBasePath}
      showPatientsNav={showPatientsNav}
      showServicesNav={showServicesNav}
      showQueueNav={showQueueNav}
      defaultView={defaultView}
      staffRole={staffRoleForProvider}
      patientsMode={patientsMode}>
      {shell}
    </StaffPortalViewProvider>
  );
}
