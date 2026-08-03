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
    <div className="relative flex h-dvh w-full min-w-0 flex-col overflow-hidden bg-slate-100">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />
      <header className="relative z-30 shrink-0 border-b border-white/60 bg-white/90 shadow-sm shadow-slate-200/40 backdrop-blur-xl">
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-4 md:h-20 md:px-6 md:py-0">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 sm:tracking-[0.2em]">
              Boshqaruv sahifasi
            </p>
            <h1 className="mt-0.5 truncate text-base font-bold text-slate-800 sm:text-lg md:mt-1 md:text-2xl">
              Security Center (Super Admin)
            </h1>
          </div>
          <RoleAwareUserMenu />
        </div>
      </header>
      <main className="relative z-10 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-3 sm:p-4 md:p-6">
        <div className="mx-auto w-full min-w-0 max-w-[1920px]">{children}</div>
      </main>
    </div>
  );
}
