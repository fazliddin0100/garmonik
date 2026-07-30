'use client';

import RoleAwareUserMenu from '@/components/auth/RoleAwareUserMenu';
import type { ReactNode } from 'react';

/** Klinika dashboard/sidebarsiz — faqat Security Center boshqaruvi. */
export default function SecurityCenterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />
      <header className="relative z-30 shrink-0 border-b border-white/60 bg-white/90 shadow-sm shadow-slate-200/40 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between gap-4 px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Boshqaruv sahifasi
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-800">
              Security Center (Super Admin)
            </h1>
          </div>
          <RoleAwareUserMenu />
        </div>
      </header>
      <main className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-6">{children}</main>
    </div>
  );
}
