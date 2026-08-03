'use client';

import OnlineNavbatCountBadge from '@/components/appointment-requests/OnlineNavbatCountBadge';
import {
  adminRestrictedNavLinks,
  adminUsesRestrictedShell,
  isAdminJwtRouteGroup,
  type AdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import { useNewOnlineQueueCount } from '@/hooks/useNewOnlineQueueCount';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const FULL_NAV: { href: string; label: string; prefix?: string }[] = [
  { href: '/dashboard', label: 'Dashboard', prefix: '/dashboard' },
  { href: '/patients', label: 'Bemorlar', prefix: '/patients' },
  { href: '/appointments', label: 'Navbat', prefix: '/appointments' },
  { href: '/users', label: 'Xodimlar', prefix: '/users' },
  { href: '/services', label: 'Xizmatlar', prefix: '/services' },
  { href: '/settings', label: 'Sozlamalar', prefix: '/settings' },
];

function isActive(pathname: string, href: string, prefix?: string): boolean {
  const p = prefix ?? href.split('?')[0] ?? href;
  return pathname === p || pathname.startsWith(`${p}/`);
}

export default function DashboardMobileNav() {
  const pathname = usePathname();
  const [shell, setShell] = useState<'loading' | 'full' | 'restricted'>('loading');
  const [adminRg, setAdminRg] = useState<AdminJwtRouteGroup | null>(null);
  const canTrackOnlineNavbat = shell === 'restricted' && adminRg === 'reception';
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
          isAdminJwtRouteGroup(me.routeGroup) &&
          adminUsesRestrictedShell(me.routeGroup)
        ) {
          setAdminRg(me.routeGroup);
          setShell('restricted');
          return;
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

  if (shell === 'loading') return null;

  const links =
    shell === 'restricted' && adminRg ?
      adminRestrictedNavLinks(adminRg)
    : FULL_NAV;

  if (links.length === 0) return null;

  return (
    <nav
      aria-label="Asosiy navigatsiya"
      className="flex gap-1.5 overflow-x-auto border-t border-white/60 bg-white/90 px-2 py-2 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((item) => {
        const hrefPath = item.href.split('?')[0] ?? item.href;
        const active = isActive(pathname, item.href, hrefPath);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              active ?
                'bg-violet-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}>
            <span>{item.label}</span>
            {item.href.startsWith('/appointments') ?
              <OnlineNavbatCountBadge count={newOnlineCount} active={active} />
            : null}
          </Link>
        );
      })}
    </nav>
  );
}
