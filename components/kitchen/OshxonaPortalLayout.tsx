'use client';

import RoleAwareUserMenu from '@/components/auth/RoleAwareUserMenu';
import { adminHomePathForRouteGroup } from '@/lib/admins/portal-routes';
import { staffHomePath } from '@/lib/staff-portal/staff-home';
import { isStaffRole, STAFF_ROLE_LABELS, type StaffRole } from '@/lib/staff-portal/types';
import { CookingPot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

type PortalUser = {
  fullName: string;
  login: string;
};

export default function OshxonaPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);

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
          role?: string;
          routeGroup?: string;
          login?: string;
          fullName?: string;
          roleLabel?: string;
          displayName?: string;
        };
        if (cancelled) return;

        if (
          me?.kind === 'staff' &&
          typeof me.role === 'string' &&
          isStaffRole(me.role) &&
          me.role === 'oshpaz'
        ) {
          setSession({
            fullName: String(me.fullName ?? STAFF_ROLE_LABELS.oshpaz),
            login: String(me.login ?? ''),
          });
          setLoading(false);
          return;
        }

        /** Xo‘jalik / oshxona admin — kitchen routeGroup */
        if (me?.kind === 'admin' && me.routeGroup === 'kitchen') {
          setSession({
            fullName: String(
              me.fullName || me.displayName || me.roleLabel || 'Oshxona',
            ),
            login: String(me.login ?? ''),
          });
          setLoading(false);
          return;
        }

        if (me?.kind === 'staff' && typeof me.role === 'string' && isStaffRole(me.role)) {
          router.replace(staffHomePath(me.role as StaffRole));
          return;
        }
        if (me?.kind === 'admin' && typeof me.routeGroup === 'string') {
          router.replace(
            adminHomePathForRouteGroup(
              me.routeGroup as Parameters<typeof adminHomePathForRouteGroup>[0],
            ),
          );
          return;
        }
        router.replace('/auth/login?next=/oshxona');
      } catch {
        if (!cancelled) router.replace('/auth/login?next=/oshxona');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50/40 text-sm text-slate-500">
        Oshxona kabineti yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-col bg-linear-to-br from-orange-50/90 via-white to-amber-50/70">
      <header className="sticky top-0 z-30 border-b border-orange-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/25">
              <CookingPot className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700/80">
                Oshxona
              </p>
              <h1 className="truncate text-base font-bold text-slate-900 md:text-lg">
                Oshxona kabineti
              </h1>
              <p className="truncate text-xs text-slate-500">
                {session.fullName}
                {session.login ? ` · ${session.login}` : ''}
              </p>
            </div>
          </div>
          <RoleAwareUserMenu />
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
