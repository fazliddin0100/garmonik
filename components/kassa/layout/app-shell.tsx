"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/kassa/utils";
import { Button } from "@/components/kassa/ui/button";
import { getClinicName } from "@/lib/kassa/receipt-branding";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AppShell({
  children,
  role,
  userName,
  navItems,
}: {
  children: React.ReactNode;
  role: "ADMIN" | "CASHIER";
  userName: string;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/kassa/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50/80">
      <aside className="no-print hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r bg-white md:flex">
        <div className="shrink-0 border-b p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Klinika kassa
          </p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">
            {getClinicName()}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{userName}</p>
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {role === "ADMIN" ? "Administrator" : "Kassir"}
          </span>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t p-4">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="no-print shrink-0 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
          <div>
            <p className="font-semibold">{userName}</p>
            <p className="text-xs text-muted-foreground">
              {role === "ADMIN" ? "Admin" : "Kassir"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            Chiqish
          </Button>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export const cashierNav: NavItem[] = [
  { href: "/kassa", label: "To'lov qabul", icon: CreditCard },
  { href: "/kassa/hisobot", label: "Kunlik hisobot", icon: BarChart3 },
  { href: "/kassa/cheklar", label: "Cheklar", icon: Receipt },
];

export const adminNav: NavItem[] = [
  { href: "/kassa-admin", label: "Boshqaruv", icon: LayoutDashboard },
  { href: "/kassa", label: "To'lov qabul", icon: CreditCard },
  { href: "/kassa-admin/hisobotlar", label: "Hisobotlar", icon: BarChart3 },
  { href: "/kassa-admin/xarajatlar", label: "Xarajatlar", icon: Wallet },
  { href: "/kassa-admin/kassirlar", label: "Kassirlar", icon: Users },
  { href: "/kassa-admin/xizmatlar", label: "Xizmatlar", icon: Settings },
];
