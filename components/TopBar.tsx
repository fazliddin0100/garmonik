"use client";

import RoleAwareUserMenu from "@/components/auth/RoleAwareUserMenu";
import GlobalSearch from "@/components/GlobalSearch";

type TopBarProps = {
  title: string;
};

export default function TopBar({ title }: TopBarProps) {
  return (
    <div className="h-14 shrink-0 border-b border-white/60 bg-white/85 shadow-sm shadow-slate-200/40 backdrop-blur-xl supports-backdrop-filter:bg-white/70 md:h-20">
      <div className="flex h-full min-w-0 items-center justify-between gap-2 px-3 sm:gap-4 sm:px-4 md:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:tracking-[0.2em]">
            {title.toLowerCase().includes("ta'minot") ||
            title.toLowerCase().includes('taminot') ?
              'Xodim kabineti'
            : 'Boshqaruv sahifasi'}
          </p>
          <h1 className="mt-0.5 truncate text-base font-bold text-slate-800 sm:text-lg md:mt-1 md:text-2xl">
            {title}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <GlobalSearch />
          <RoleAwareUserMenu />
        </div>
      </div>
    </div>
  );
}
