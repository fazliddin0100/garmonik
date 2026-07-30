'use client';

import RoleAwareUserMenu from '@/components/auth/RoleAwareUserMenu';
import { useHeadNurseView, type HeadNurseViewId } from '@/components/head-nurse/HeadNurseViewContext';
import { staffHomePath } from '@/lib/staff-portal/staff-home';
import { isStaffRole, STAFF_ROLE_LABELS, type StaffRole } from '@/lib/staff-portal/types';
import {
  BedDouble,
  ClipboardList,
  HeartPulse,
  Home,
  Hospital,
  LayoutGrid,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

type MeStaff = {
  kind: 'staff';
  role: StaffRole;
  fullName: string;
};

const NAV: { view: HeadNurseViewId; label: string; icon: LucideIcon }[] = [
  { view: 'home', label: 'Bosh sahifa', icon: Home },
  { view: 'yotqizish', label: 'Yotqizish', icon: ClipboardList },
  { view: 'statsionar', label: 'Statsionar', icon: Hospital },
  { view: 'kuzatuv', label: 'Uyga kuzatuv', icon: HeartPulse },
  { view: 'xonalar', label: 'Xonalar', icon: BedDouble },
];

export default function HeadNursePortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { view, title, setView } = useHeadNurseView();
  const [session, setSession] = useState<MeStaff | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        const me = await res.json();
        if (cancelled) return;
        if (me?.kind === 'staff' && me.role === 'head_nurse') {
          setSession({ kind: 'staff', role: 'head_nurse', fullName: me.fullName ?? 'Bosh hamshira' });
          return;
        }
        if (
          me?.kind === 'admin' &&
          me.routeGroup === 'nursing' &&
          typeof me.fullName === 'string'
        ) {
          setSession({ kind: 'staff', role: 'head_nurse', fullName: me.fullName });
          return;
        }
        if (me?.kind === 'staff' && isStaffRole(me.role)) {
          router.replace(staffHomePath(me.role));
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
  }, [router]);

  const navClass = useMemo(
    () => (active: boolean) =>
      `flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ?
          'bg-linear-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-500/25'
        : 'text-slate-600 hover:bg-white hover:text-slate-900'
      }`,
    [],
  );

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-500">
        Yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-[1920px] overflow-hidden bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-56 shrink-0 flex-col overflow-hidden border-r border-white/60 bg-white/80 backdrop-blur-xl md:flex">
        <div className="shrink-0 border-b border-white/60 px-4 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-600/90">
            Xodim kabineti
          </p>
          <p className="mt-1 text-lg font-bold text-slate-800">Bosh hamshira</p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-900">
            <LayoutGrid className="size-4 shrink-0" />
            <span className="truncate font-medium">{session.fullName}</span>
          </div>
          <p className="mt-1 px-1 text-[11px] text-slate-500">
            {STAFF_ROLE_LABELS.head_nurse}
          </p>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-y-contain p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={navClass(view === item.view)}>
                <Icon className="size-4 shrink-0 opacity-90" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:pl-56">
        <header className="z-20 shrink-0 border-b border-white/60 bg-white/85 shadow-sm backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Kabinet</p>
              <h1 className="text-xl font-bold text-slate-800 md:text-2xl">
                {view === 'home' ? 'Bosh hamshira kabineti' : title}
              </h1>
            </div>
            <RoleAwareUserMenu />
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-2 py-2 md:hidden">
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setView(item.view)}
                  className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    view === item.view ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                  <Icon className="size-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
