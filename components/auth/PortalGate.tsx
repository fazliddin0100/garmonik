'use client';

import {
  adminHomePathForRouteGroup,
  type AdminJwtRouteGroup,
  isAdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type MeResponse =
  | { kind: 'none' }
  | {
      kind: 'admin';
      id: string;
      routeGroup?: string;
    }
  | {
      kind: 'staff';
      id: string;
      role: string;
      login: string;
      fullName: string;
    };

type PortalGateProps = {
  children: React.ReactNode;
  /** @deprecated — `allowedAdminRouteGroups={['admin_only']}` */
  adminOnly?: boolean;
  /** Belgilansa: faqat ushbu `routeGroup` dagi Mongo adminlar kiradi */
  allowedAdminRouteGroups?: readonly AdminJwtRouteGroup[];
  /** Belgilansa: ushbu guruhlardagi adminlar rad etiladi (masalan hisobotlar: hr, reception, it) */
  deniedAdminRouteGroups?: readonly AdminJwtRouteGroup[];
};

export default function PortalGate({
  children,
  adminOnly = false,
  allowedAdminRouteGroups,
  deniedAdminRouteGroups,
}: PortalGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  const requiredAdminGroups = useMemo((): readonly AdminJwtRouteGroup[] | null => {
    if (allowedAdminRouteGroups && allowedAdminRouteGroups.length > 0) {
      return allowedAdminRouteGroups;
    }
    if (adminOnly) return ['admin_only'];
    return null;
  }, [adminOnly, allowedAdminRouteGroups]);

  const denied = useMemo(
    () => deniedAdminRouteGroups ?? [],
    [deniedAdminRouteGroups],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        const me = (await res.json()) as MeResponse;
        if (cancelled) return;

        if (requiredAdminGroups) {
          if (
            me.kind === 'admin' &&
            typeof me.routeGroup === 'string' &&
            isAdminJwtRouteGroup(me.routeGroup) &&
            requiredAdminGroups.includes(me.routeGroup)
          ) {
            setAllowed(true);
            return;
          }
          if (
            me.kind === 'admin' &&
            typeof me.routeGroup === 'string' &&
            isAdminJwtRouteGroup(me.routeGroup)
          ) {
            router.replace(adminHomePathForRouteGroup(me.routeGroup));
            return;
          }
          const q = encodeURIComponent(pathname || '/');
          router.replace(`/auth/login?next=${q}`);
          return;
        }

        if (denied.length > 0 && me.kind === 'admin') {
          const rg =
            typeof me.routeGroup === 'string' && isAdminJwtRouteGroup(me.routeGroup) ?
              me.routeGroup
            : 'admin_only';
          if (denied.includes(rg)) {
            router.replace(adminHomePathForRouteGroup(rg));
            return;
          }
        }

        if (me.kind === 'admin' || me.kind === 'staff') {
          setAllowed(true);
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
  }, [denied, pathname, requiredAdminGroups, router]);

  if (!allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        Kirish tekshirilmoqda…
      </div>
    );
  }

  return <>{children}</>;
}
