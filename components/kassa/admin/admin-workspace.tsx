"use client";

import { useCallback, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  PencilLine,
  RotateCcw,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { WorkspaceShell } from "@/components/kassa/layout/workspace-shell";
import { AdminDashboardView } from "@/components/kassa/views/admin-dashboard-view";
import { ReportsDashboard } from "@/components/kassa/reports/reports-dashboard";
import { ExpensesView } from "@/components/kassa/views/expenses-view";
import { FinancialCorrectionsView } from "@/components/kassa/views/financial-corrections-view";
import { InvoiceRefundsView } from "@/components/kassa/views/invoice-refunds-view";
import { AuditLogsView } from "@/components/kassa/views/audit-logs-view";
import { CashiersView } from "@/components/kassa/views/cashiers-view";
import { ServicesView } from "@/components/kassa/views/services-view";
import { DebtsView } from "@/components/kassa/views/debts-view";
import type { AdminView } from "@/components/kassa/admin/types";

export type { AdminView };

const NAV = [
  { id: "dashboard" as const, label: "Boshqaruv", icon: LayoutDashboard },
  { id: "reports" as const, label: "Hisobotlar", icon: BarChart3 },
  { id: "corrections" as const, label: "Summa tuzatish", icon: PencilLine },
  { id: "refunds" as const, label: "Pul qaytarish", icon: RotateCcw },
  { id: "logs" as const, label: "Harakatlar jurnali", icon: ClipboardList },
  { id: "debts" as const, label: "Qarzdorlik", icon: HandCoins },
  { id: "expenses" as const, label: "Xarajatlar", icon: Wallet },
  { id: "cashiers" as const, label: "Foydalanuvchilar", icon: Users },
  { id: "services" as const, label: "Xizmatlar", icon: Settings },
];

export function AdminWorkspace({
  userName,
  userId,
}: {
  userName: string;
  userId: string;
}) {
  const [view, setView] = useState<AdminView>("dashboard");
  const [visited, setVisited] = useState<Set<AdminView>>(() => new Set(["dashboard"]));

  const navigate = useCallback((next: AdminView) => {
    setView(next);
    setVisited((prev) => new Set(prev).add(next));
  }, []);

  return (
    <WorkspaceShell
      theme="admin"
      userName={userName}
      roleLabel="Buxgalter"
      navItems={NAV}
      activeView={view}
      onNavigate={navigate}
    >
      {visited.has("dashboard") && (
        <div className={view === "dashboard" ? "animate-fade-up" : "hidden"}>
          <AdminDashboardView onNavigate={navigate} />
        </div>
      )}
      {visited.has("reports") && (
        <div className={view === "reports" ? "animate-fade-up" : "hidden"}>
          <ReportsDashboard />
        </div>
      )}
      {visited.has("corrections") && (
        <div className={view === "corrections" ? "animate-fade-up" : "hidden"}>
          <FinancialCorrectionsView isActive={view === "corrections"} />
        </div>
      )}
      {visited.has("refunds") && (
        <div className={view === "refunds" ? "animate-fade-up" : "hidden"}>
          <InvoiceRefundsView isActive={view === "refunds"} />
        </div>
      )}
      {visited.has("logs") && (
        <div className={view === "logs" ? "animate-fade-up" : "hidden"}>
          <AuditLogsView isActive={view === "logs"} />
        </div>
      )}
      {visited.has("debts") && (
        <div className={view === "debts" ? "animate-fade-up" : "hidden"}>
          <DebtsView
            accent="violet"
            isActive={view === "debts"}
            allowDebtCancel
          />
        </div>
      )}
      {visited.has("expenses") && (
        <div className={view === "expenses" ? "animate-fade-up" : "hidden"}>
          <ExpensesView />
        </div>
      )}
      {visited.has("cashiers") && (
        <div className={view === "cashiers" ? "animate-fade-up" : "hidden"}>
          <CashiersView currentUserId={userId} />
        </div>
      )}
      {visited.has("services") && (
        <div className={view === "services" ? "animate-fade-up" : "hidden"}>
          <ServicesView />
        </div>
      )}
    </WorkspaceShell>
  );
}
