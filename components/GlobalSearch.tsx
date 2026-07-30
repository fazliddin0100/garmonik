"use client";

import { useDashboardViewOptional } from "@/components/dashboard/DashboardViewContext";
import { usePortalNavOptional } from "@/components/portal/PortalNavContext";
import {
  dashboardSubNavItems,
  persistDashboardInitialView,
  type DashboardViewId,
} from "@/lib/dashboard/views";
import {
  isPortalShellPath,
  persistPortalInitialSection,
  type PortalMainSectionId,
} from "@/lib/portal/sections";
import {
  persistUsersInitialView,
  usersSubNavItems,
  type UsersViewId,
} from "@/lib/users/views";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SearchRecord = {
  id: string;
  label: string;
  description: string;
  href: string;
  dashboardView?: DashboardViewId;
  portalSection?: PortalMainSectionId;
  usersView?: UsersViewId;
};

const baseRecords: SearchRecord[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Umumiy statistika",
    href: "/dashboard",
    dashboardView: "overview",
  },
  ...dashboardSubNavItems.map((item) => ({
    id: `dash-${item.view}`,
    label: item.label,
    description: `Dashboard — ${item.label.toLowerCase()}`,
    href: "/dashboard",
    dashboardView: item.view,
  })),
  {
    id: "users-hub",
    label: "Xodimlar",
    description: "Barcha xodimlar bo'limlari",
    href: "/users",
    portalSection: "users",
    usersView: "hub",
  },
  ...usersSubNavItems.map((item) => ({
    id: `users-${item.view}`,
    label: item.label,
    description: `Xodimlar — ${item.label.toLowerCase()}`,
    href: "/users",
    portalSection: "users" as const,
    usersView: item.view,
  })),
  { id: "kadrlar", label: "Kadrlar bo'limi", description: "Login va parollar", href: "/kadrlar" },
  {
    id: "patients",
    label: "Patients",
    description: "Bemorlar bo'limi",
    href: "/patients",
    portalSection: "patients",
  },
  {
    id: "appointments",
    label: "Navbat",
    description: "Qabul va jonli navbat",
    href: "/appointments",
    portalSection: "appointments",
  },
  {
    id: "services",
    label: "Services",
    description: "Xizmatlar bo'limi",
    href: "/services",
    portalSection: "services",
  },
  {
    id: "reports",
    label: "Reports",
    description: "Hisobotlar",
    href: "/reports",
    portalSection: "reports",
  },
  {
    id: "settings",
    label: "Sozlamalar",
    description: "Klinika va tizim sozlamalari",
    href: "/settings",
    portalSection: "settings",
  },
];

const scopedRecords: Record<string, SearchRecord[]> = {
  "/users/admins": [
    { id: "admin-1", label: "Azizbek", description: "Super Admin", href: "/users", portalSection: "users", usersView: "admins" },
    { id: "admin-2", label: "Madina", description: "Finance Admin", href: "/users", portalSection: "users", usersView: "admins" },
    { id: "admin-3", label: "Ibrohim", description: "HR Admin", href: "/users", portalSection: "users", usersView: "admins" },
  ],
  "/users/doctors": [
    { id: "doctor-1", label: "Kardiologiya", description: "4 ta mutaxassis", href: "/users", portalSection: "users", usersView: "doctors" },
    { id: "doctor-2", label: "Endokrinologiya", description: "3 ta mutaxassis", href: "/users", portalSection: "users", usersView: "doctors" },
    { id: "doctor-3", label: "Terapiya", description: "6 ta mutaxassis", href: "/users", portalSection: "users", usersView: "doctors" },
    { id: "doctor-4", label: "Pediatriya", description: "5 ta mutaxassis", href: "/users", portalSection: "users", usersView: "doctors" },
  ],
  "/patients": [
    { id: "patients-1", label: "Yangi bemor", description: "29", href: "/patients", portalSection: "patients" },
    { id: "patients-2", label: "Qayta tashrif", description: "112", href: "/patients", portalSection: "patients" },
    { id: "patients-3", label: "Arxiv", description: "3420", href: "/patients", portalSection: "patients" },
  ],
};

function getScopedKey(pathname: string) {
  if (pathname.startsWith("/users/admins")) return "/users/admins";
  if (pathname.startsWith("/users/doctors")) return "/users/doctors";
  if (pathname.startsWith("/patients")) return "/patients";
  return "";
}

export default function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const dashboardView = useDashboardViewOptional();
  const portalNav = usePortalNavOptional();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const records = useMemo(() => {
    const key = getScopedKey(pathname);
    const scoped = key ? scopedRecords[key] ?? [] : [];
    return [...scoped, ...baseRecords];
  }, [pathname]);

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];

    return records.filter(
      (item) =>
        item.label.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword),
    );
  }, [query, records]);

  function onNavigate(item: SearchRecord) {
    setOpen(false);
    setQuery("");

    if (item.dashboardView) {
      if (pathname === "/dashboard" && dashboardView) {
        dashboardView.openView(item.dashboardView);
      } else {
        persistDashboardInitialView(item.dashboardView);
        router.push("/dashboard");
      }
      return;
    }

    if (item.portalSection) {
      if (item.usersView) {
        if (portalNav && isPortalShellPath(pathname)) {
          portalNav.openUsersView(item.usersView);
          return;
        }
        persistPortalInitialSection("users");
        persistUsersInitialView(item.usersView);
        router.push("/users");
        return;
      }

      if (portalNav && isPortalShellPath(pathname)) {
        portalNav.openMainSection(item.portalSection);
        return;
      }
      persistPortalInitialSection(item.portalSection);
      router.push(item.href);
      return;
    }

    router.push(item.href);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && results.length > 0) onNavigate(results[0]);
    if (event.key === "Escape") setOpen(false);
  }

  return (
    <div className="relative hidden md:block">
      <div className="flex items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-500 shadow-sm">
        <Search className="h-4 w-4" />
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Qidirish..."
          className="w-56 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/70 bg-white/95 p-2 shadow-2xl backdrop-blur-xl">
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onNavigate(item)}
                className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-violet-50">
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-slate-500">Hech narsa topilmadi</p>
          )}
        </div>
      )}
    </div>
  );
}
