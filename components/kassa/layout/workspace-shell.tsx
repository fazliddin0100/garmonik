"use client";

import { useRouter } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/kassa/utils";
import { Button } from "@/components/kassa/ui/button";
import { CLINIC_LOGO_PATH, getClinicName } from "@/lib/kassa/receipt-branding";

export type NavItem<T extends string> = {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type WorkspaceShellProps<T extends string> = {
  theme: "admin" | "cashier";
  userName: string;
  roleLabel: string;
  navItems: NavItem<T>[];
  activeView: T;
  onNavigate: (view: T) => void;
  fixedHeader?: React.ReactNode;
  children: React.ReactNode;
};

export function WorkspaceShell<T extends string>({
  theme,
  userName,
  roleLabel,
  navItems,
  activeView,
  onNavigate,
  fixedHeader,
  children,
}: WorkspaceShellProps<T>) {
  const router = useRouter();
  const isAdmin = theme === "admin";
  const clinicName = getClinicName();

  async function logout() {
    await fetch("/api/kassa/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div
      className={cn(
        "flex h-dvh overflow-hidden",
        isAdmin ? "mesh-admin" : "mesh-cashier"
      )}
    >
      <aside
        className={cn(
          "no-print fixed inset-y-0 left-0 z-30 hidden h-dvh w-[17rem] shrink-0 flex-col overflow-hidden md:flex",
          isAdmin
            ? "bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white"
            : "border-r border-emerald-100/80 bg-gradient-to-b from-white via-emerald-50/30 to-teal-50/40 shadow-xl shadow-emerald-900/5 backdrop-blur-sm"
        )}
      >
        {!isAdmin && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-400" />
        )}
        <div className={cn("shrink-0 p-6", isAdmin ? "border-b border-white/10" : "border-b border-emerald-100")}>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CLINIC_LOGO_PATH}
              alt=""
              className={cn(
                "h-10 w-10 rounded-xl object-contain",
                isAdmin ? "ring-2 ring-white/20" : "ring-2 ring-emerald-200 shadow-sm"
              )}
            />
            <div>
              <p className={cn("text-[10px] font-semibold uppercase tracking-widest", isAdmin ? "text-violet-300" : "text-emerald-600")}>
                POS Kassa
              </p>
              <h1 className={cn("text-sm font-bold leading-tight", isAdmin ? "text-white" : "text-slate-900")}>
                {clinicName}
              </h1>
            </div>
          </div>
          <div className={cn("mt-5 rounded-xl p-3", isAdmin ? "bg-white/5" : "bg-emerald-50")}>
            <p className={cn("text-sm font-semibold", isAdmin ? "text-white" : "text-slate-900")}>{userName}</p>
            <span
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                isAdmin ? "bg-violet-500/20 text-violet-200" : "bg-emerald-500/15 text-emerald-700"
              )}
            >
              <Sparkles className="h-3 w-3" />
              {roleLabel}
            </span>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "animate-slide-right flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-all duration-200",
                  isAdmin
                    ? active
                      ? "nav-glow-admin bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                    : active
                      ? "nav-glow-cashier bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-sm")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={cn("shrink-0 p-4", isAdmin ? "border-t border-white/10" : "border-t border-emerald-100")}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 rounded-xl",
              isAdmin
                ? "text-slate-400 hover:bg-white/10 hover:text-white"
                : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            )}
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:pl-[17rem]">
        <header
          className={cn(
            "no-print shrink-0 border-b px-4 py-3 md:hidden",
            isAdmin ? "border-violet-100 bg-white/80 backdrop-blur-md" : "border-emerald-100 bg-white/90 backdrop-blur-md"
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{userName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" onClick={logout}>
              Chiqish
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
                    active
                      ? isAdmin
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md"
                        : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                      : "border border-slate-200 bg-white text-slate-600"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        {fixedHeader ? (
          <div className="no-print shrink-0 border-b border-emerald-100/80 bg-white/95 px-4 py-4 backdrop-blur-md md:px-8 lg:px-10">
            {fixedHeader}
          </div>
        ) : null}

        <main
          className={cn(
            "relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-10",
            !isAdmin && "mesh-cashier-content"
          )}
        >
          {!isAdmin && (
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-emerald-400/5 blur-3xl" />
          )}
          <div className="relative">{children}</div>
        </main>
      </div>
    </div>
  );
}
