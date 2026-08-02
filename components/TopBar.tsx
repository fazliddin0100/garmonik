"use client";

import RoleAwareUserMenu from "@/components/auth/RoleAwareUserMenu";
import GlobalSearch from "@/components/GlobalSearch";
import NotificationDropdown from "@/components/NotificationDropdown";

type TopBarProps = {
  title: string;
};

export default function TopBar({ title }: TopBarProps) {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 h-20 shrink-0 border-b border-white/60 bg-white/85 shadow-sm shadow-slate-200/40 backdrop-blur-xl supports-backdrop-filter:bg-white/70 md:left-45">
      <div className="flex h-full items-center justify-between gap-4 px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {title.toLowerCase().includes("ta'minot") ||
            title.toLowerCase().includes('taminot') ?
              'Xodim kabineti'
            : 'Boshqaruv sahifasi'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-800">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          <GlobalSearch />

          <NotificationDropdown />

          <RoleAwareUserMenu />
        </div>
      </div>
    </header>
  );
}
