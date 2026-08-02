'use client';

import RoleAwareUserMenu from '@/components/auth/RoleAwareUserMenu';
import { staffHomePath } from '@/lib/staff-portal/staff-home';
import { isStaffRole, STAFF_ROLE_LABELS, type StaffRole } from '@/lib/staff-portal/types';
import { Pill } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

type MeStaff = {
  kind: 'staff';
  id: string;
  role: StaffRole;
  login: string;
  fullName: string;
};

export default function FarmatsevtPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<MeStaff | null>(null);
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
          id?: string;
          login?: string;
          fullName?: string;
        };
        if (cancelled) return;
        if (
          me?.kind === 'staff' &&
          typeof me.role === 'string' &&
          isStaffRole(me.role) &&
          me.role === 'farmatsevt'
        ) {
          setSession({
            kind: 'staff',
            id: String(me.id ?? ''),
            role: me.role,
            login: String(me.login ?? ''),
            fullName: String(me.fullName ?? ''),
          });
          setLoading(false);
          return;
        }
        if (me?.kind === 'staff' && typeof me.role === 'string' && isStaffRole(me.role)) {
          router.replace(staffHomePath(me.role));
          return;
        }
        router.replace('/auth/login?next=/farmatsevt');
      } catch {
        if (!cancelled) router.replace('/auth/login?next=/farmatsevt');
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Farmatsevt kabineti yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50/80 via-white to-teal-50/60">
      <header className="sticky top-0 z-30 border-b border-emerald-100/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25">
              <Pill className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700/80">
                Dorixona
              </p>
              <h1 className="truncate text-base font-bold text-slate-900 md:text-lg">
                Farmatsevt kabineti
              </h1>
              <p className="truncate text-xs text-slate-500">
                {session.fullName || STAFF_ROLE_LABELS.farmatsevt}
                {session.login ? ` · ${session.login}` : ''}
              </p>
            </div>
          </div>
          <RoleAwareUserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
