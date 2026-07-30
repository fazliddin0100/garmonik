'use client';

import {
  adminRestrictedNavLinks,
  adminUsesRestrictedShell,
  isAdminJwtRouteGroup,
  type AdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import {
  Bandage,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  DoorOpen,
  FileBarChart2,
  FileSignature,
  Handshake,
  IdCard,
  LayoutDashboard,
  Microscope,
  Package,
  Pill,
  Settings,
  Stethoscope,
  Tags,
  UserRoundCog,
  UserRoundPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useDashboardViewOptional } from '@/components/dashboard/DashboardViewContext';
import { usePortalNavOptional } from '@/components/portal/PortalNavContext';
import {
  dashboardSubNavItems,
  persistDashboardInitialView,
  type DashboardViewId,
} from '@/lib/dashboard/views';
import {
  isPortalShellPath,
  persistPortalInitialSection,
  type PortalMainSectionId,
} from '@/lib/portal/sections';
import {
  persistUsersInitialView,
  usersSubNavItems,
  type UsersViewId,
} from '@/lib/users/views';
import { usePathname, useRouter } from 'next/navigation';
import OnlineNavbatCountBadge from '@/components/appointment-requests/OnlineNavbatCountBadge';
import { useNewOnlineQueueCount } from '@/hooks/useNewOnlineQueueCount';
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import { Button } from './ui/button';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type NavSubItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const dashboardSubIcons: Record<
  Exclude<DashboardViewId, 'overview'>,
  ComponentType<{ className?: string }>
> = {
  departments: Building2,
  rooms: DoorOpen,
  'service-types': Tags,
  products: Package,
  partners: Handshake,
  contracts: FileSignature,
};

const usersSubIcons: Record<
  Exclude<UsersViewId, 'hub'>,
  ComponentType<{ className?: string }>
> = {
  admins: UserRoundCog,
  doctors: Stethoscope,
  nurses: Bandage,
  laboratory: Microscope,
  reception: IdCard,
  pharmacists: Pill,
  staff: UserRoundPlus,
};

const mainNavItems: {
  section: PortalMainSectionId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { section: 'patients', label: 'Patients', icon: Users },
  { section: 'appointments', label: 'Navbat', icon: CalendarDays },
  { section: 'services', label: 'Services', icon: ClipboardList },
  { section: 'reports', label: 'Reports', icon: FileBarChart2 },
  { section: 'settings', label: 'Sozlamalar', icon: Settings },
];

function pathUnderDashboardTree(pathname: string) {
  return pathname === '/dashboard';
}

function pathUnderStaffTree(pathname: string, mainSection: PortalMainSectionId | null) {
  if (mainSection === 'users') return true;
  return pathname === '/users' || pathname.startsWith('/users/') || pathname.startsWith('/kadrlar');
}

function SubMenuPanel({
  items,
  pathname,
}: {
  items: NavSubItem[];
  pathname: string;
}) {
  return (
    <div className="ml-2 space-y-0.5 border-l-2 border-violet-200/80 py-1 pl-3">
      {items.map((sub) => {
        const subActive =
          pathname === sub.href || pathname.startsWith(`${sub.href}/`);
        const SubIcon = sub.icon;
        return (
          <Link
            key={sub.href}
            href={sub.href}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-200 ${
              subActive ?
                'bg-violet-100 text-violet-900'
              : 'text-slate-600 hover:bg-white/90 hover:text-slate-900'
            }`}>
            <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="leading-tight">{sub.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function UsersSubMenuPanel({
  activeView,
  onSelect,
}: {
  activeView: UsersViewId;
  onSelect: (view: UsersViewId) => void;
}) {
  return (
    <div className="ml-2 space-y-0.5 border-l-2 border-violet-200/80 py-1 pl-3">
      {usersSubNavItems.map((sub) => {
        const subActive = activeView === sub.view;
        const SubIcon = usersSubIcons[sub.view];
        return (
          <button
            key={sub.view}
            type="button"
            onClick={() => onSelect(sub.view)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors duration-200 ${
              subActive ?
                'bg-violet-100 text-violet-900'
              : 'text-slate-600 hover:bg-white/90 hover:text-slate-900'
            }`}>
            <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="leading-tight">{sub.label}</span>
          </button>
        );
      })}
      <Link
        href="/kadrlar"
        className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-600 transition-colors duration-200 hover:bg-white/90 hover:text-slate-900">
        <Briefcase className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <span className="leading-tight">Kadrlar bo‘limi</span>
      </Link>
    </div>
  );
}

function DashboardSubMenuPanel({
  activeView,
  onSelect,
}: {
  activeView: DashboardViewId;
  onSelect: (view: DashboardViewId) => void;
}) {
  return (
    <div className="ml-2 space-y-0.5 border-l-2 border-violet-200/80 py-1 pl-3">
      {dashboardSubNavItems.map((sub) => {
        const subActive = activeView === sub.view;
        const SubIcon = dashboardSubIcons[sub.view];
        return (
          <button
            key={sub.view}
            type="button"
            onClick={() => onSelect(sub.view)}
            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors duration-200 ${
              subActive ?
                'bg-violet-100 text-violet-900'
              : 'text-slate-600 hover:bg-white/90 hover:text-slate-900'
            }`}>
            <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="leading-tight">{sub.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AccordionRow({
  href,
  label,
  Icon,
  open,
  onToggle,
  treeActive,
  onMainClick,
  toggleAriaOpen,
  toggleAriaClosed,
}: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  treeActive: boolean;
  onMainClick?: () => void;
  toggleAriaOpen: string;
  toggleAriaClosed: string;
}) {
  const toggleClassName = `flex shrink-0 items-center justify-center px-2.5 transition-colors ${
    treeActive ?
      'text-white/90 hover:bg-white/15'
    : 'rounded-r-xl hover:bg-white/90 hover:text-slate-900'
  }`;

  const chevron = (
    <ChevronDown
      className={`h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${
        open ? 'rotate-180' : ''
      }`}
    />
  );

  const isExpanded: boolean = Boolean(open);

  return (
    <div
      className={`flex items-stretch gap-0.5 overflow-hidden rounded-xl transition-all ${
        treeActive ?
          'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
        : 'text-slate-600'
      }`}>
      {onMainClick ?
        <button
          type="button"
          onClick={onMainClick}
          className={`group relative flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-3.5 py-2.5 text-left text-sm transition-all ${
            treeActive ? 'text-white' : 'hover:bg-white/90 hover:text-slate-900'
          }`}>
          {!treeActive && (
            <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-transparent transition-colors group-hover:bg-violet-400/80" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium">{label}</span>
        </button>
      : <Link
          href={href}
          className={`group relative flex min-w-0 flex-1 items-center gap-3 px-3.5 py-2.5 text-sm transition-all ${
            treeActive ? 'text-white' : 'hover:bg-white/90 hover:text-slate-900'
          } rounded-l-xl`}>
          {!treeActive && (
            <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-transparent transition-colors group-hover:bg-violet-400/80" />
          )}
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate font-medium">{label}</span>
        </Link>
      }
      <Button
        variant="link"
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? toggleAriaOpen : toggleAriaClosed}
        onClick={onToggle}
        className={toggleClassName}>
        {chevron}
      </Button>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dashboardViewCtx = useDashboardViewOptional();
  const portalNav = usePortalNavOptional();
  const dashboardActive = useMemo(
    () => pathUnderDashboardTree(pathname),
    [pathname],
  );
  const staffActive = useMemo(
    () => pathUnderStaffTree(pathname, portalNav?.mainSection ?? null),
    [pathname, portalNav?.mainSection],
  );

  const [dashboardOpen, setDashboardOpen] = useState(dashboardActive);
  const [staffOpen, setStaffOpen] = useState(staffActive);

  const [shell, setShell] = useState<'loading' | 'full' | 'restricted'>(
    'loading',
  );
  const [adminRg, setAdminRg] = useState<AdminJwtRouteGroup | null>(null);
  const canTrackOnlineNavbat =
    shell === 'full' ||
    (shell === 'restricted' && adminRg === 'reception');
  const newOnlineCount = useNewOnlineQueueCount(canTrackOnlineNavbat);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const me = (await res.json()) as {
          kind?: string;
          routeGroup?: string;
        };
        if (cancelled) return;
        if (me?.kind === 'staff') {
          setShell('full');
          return;
        }
        if (
          me?.kind === 'admin' &&
          typeof me.routeGroup === 'string' &&
          isAdminJwtRouteGroup(me.routeGroup)
        ) {
          const rg = me.routeGroup;
          if (adminUsesRestrictedShell(rg)) {
            setAdminRg(rg);
            setShell('restricted');
            return;
          }
        }
        setShell('full');
      } catch {
        if (!cancelled) setShell('full');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dashboardActive) return;
    queueMicrotask(() => {
      startTransition(() => setDashboardOpen(true));
    });
  }, [dashboardActive]);

  useEffect(() => {
    if (!staffActive) return;
    queueMicrotask(() => {
      startTransition(() => setStaffOpen(true));
    });
  }, [staffActive]);

  if (shell === 'loading') {
    return (
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-45 overflow-hidden border-r border-white/50 bg-white/65 backdrop-blur-xl md:flex md:flex-col">
        <div className="border-b border-white/60 px-6 py-6">
          <p className="text-sm text-slate-500">Menyu yuklanmoqda…</p>
        </div>
      </aside>
    );
  }

  if (shell === 'restricted' && adminRg) {
    const links = adminRestrictedNavLinks(adminRg);
    return (
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-45 overflow-hidden border-r border-white/50 bg-white/65 backdrop-blur-xl md:flex md:flex-col">
        <div className="border-b border-white/60 px-6 py-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/80">
            Gormonik Plus
          </p>
          <h2 className="text-xl font-bold text-slate-800">Kabinet</h2>
          <p className="mt-1 text-xs text-slate-500">Cheklangan kirish</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {links.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const SubIcon =
              item.href.startsWith('/reports') ? FileBarChart2
              : item.href.startsWith('/kadrlar') ? Briefcase
              : item.href.startsWith('/patients') ? Users
              : item.href.startsWith('/appointments') ? CalendarDays
              : item.href.startsWith('/settings') ? Settings
              : LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive ?
                    'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-600 hover:bg-white/90 hover:text-slate-900'
                }`}>
                <SubIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.href.startsWith('/appointments') ?
                  <OnlineNavbatCountBadge
                    count={newOnlineCount}
                    active={isActive}
                  />
                : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-45 overflow-hidden border-r border-white/50 bg-white/65 backdrop-blur-xl md:flex md:flex-col">
      <div className="border-b border-white/60 px-6 py-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/80">
          Gormonik Plus
        </p>
        <h2 className="text-xl font-bold text-slate-800">Klinika Paneli</h2>
        <p className="mt-1 text-sm text-slate-500">Boshqaruv markazi</p>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto p-4">
        <div className="space-y-0.5">
          <AccordionRow
            href="/dashboard"
            label="Dashboard"
            Icon={LayoutDashboard}
            open={dashboardOpen}
            onToggle={() => setDashboardOpen((o) => !o)}
            treeActive={dashboardActive}
            onMainClick={() => {
              if (dashboardViewCtx) {
                dashboardViewCtx.setView('overview');
              }
              if (pathname !== '/dashboard') {
                router.push('/dashboard');
              }
            }}
            toggleAriaOpen="Dashboard menyusini yopish"
            toggleAriaClosed="Dashboard menyusini ochish"
          />
          <div
            className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
              dashboardOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}>
            <div className="min-h-0">
              <DashboardSubMenuPanel
                activeView={dashboardViewCtx?.view ?? 'overview'}
                onSelect={(view) => {
                  if (dashboardViewCtx) {
                    dashboardViewCtx.openView(view);
                    return;
                  }
                  persistDashboardInitialView(view);
                  router.push('/dashboard');
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-0.5">
          <AccordionRow
            href="/users"
            label="Xodimlar"
            Icon={UsersRound}
            open={staffOpen}
            onToggle={() => setStaffOpen((o) => !o)}
            treeActive={staffActive}
            onMainClick={() => {
              if (portalNav) {
                portalNav.openUsersView('hub');
                return;
              }
              persistUsersInitialView('hub');
              router.push('/users');
            }}
            toggleAriaOpen="Xodimlar menyusini yopish"
            toggleAriaClosed="Xodimlar menyusini ochish"
          />
          <div
            className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none ${
              staffOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}>
            <div className="min-h-0">
              <UsersSubMenuPanel
                activeView={portalNav?.usersView ?? 'hub'}
                onSelect={(view) => {
                  if (portalNav) {
                    portalNav.openUsersView(view);
                    return;
                  }
                  persistUsersInitialView(view);
                  router.push('/users');
                }}
              />
            </div>
          </div>
        </div>

        {mainNavItems.map((item) => {
          const isActive =
            portalNav?.onPortalShell ?
              portalNav.mainSection === item.section
            : pathname === `/${item.section}` ||
              pathname.startsWith(`/${item.section}/`);
          const Icon = item.icon;

          return (
            <button
              key={item.section}
              type="button"
              onClick={() => {
                if (portalNav) {
                  portalNav.openMainSection(item.section);
                  return;
                }
                persistPortalInitialSection(item.section);
                router.push(`/${item.section}`);
              }}
              className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3.5 py-2.5 text-left text-sm transition-all ${
                isActive ?
                  'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                : 'text-slate-600 hover:bg-white/90 hover:text-slate-900'
              }`}>
              {!isActive && (
                <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-transparent transition-colors group-hover:bg-violet-400/80" />
              )}
              <Icon className="h-4 w-4" />
              <span className="min-w-0 flex-1 font-medium">{item.label}</span>
              {item.section === 'appointments' ?
                <OnlineNavbatCountBadge
                  count={newOnlineCount}
                  active={isActive}
                />
              : null}
            </button>
          );
        })}
      </nav>

      {/* <div className="m-4 rounded-2xl border border-violet-200/60 bg-linear-to-br from-violet-50 to-indigo-50 p-4">
        <p className="text-xs text-violet-700/80">Faol sessiya</p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          Admin portal xavfsiz rejimda ishlamoqda
        </p>
      </div> */}
    </aside>
  );
}
