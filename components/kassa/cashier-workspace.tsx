"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart3, CreditCard, HandCoins, Receipt, Wallet } from "lucide-react";
import type { UserRole } from ".prisma/kassa-client";
import { WorkspaceShell } from "@/components/kassa/layout/workspace-shell";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { CashierTopBar } from "@/components/kassa/cashier-top-bar";
import { PaymentForm } from "@/components/kassa/payment/payment-form";
import { CashierReportView } from "@/components/kassa/views/cashier-report-view";
import { ReceiptsView } from "@/components/kassa/views/receipts-view";
import { DebtsView } from "@/components/kassa/views/debts-view";
import { ExpensesView } from "@/components/kassa/views/expenses-view";
import type { CashierView } from "@/components/kassa/types";

const NAV = [
  { id: "payment" as const, label: "To'lov qabul", icon: CreditCard },
  { id: "debts" as const, label: "Qarzdorlik", icon: HandCoins },
  { id: "expenses" as const, label: "Xarajatlar", icon: Wallet },
  { id: "report" as const, label: "Kunlik hisobot", icon: BarChart3 },
  { id: "receipts" as const, label: "Cheklar", icon: Receipt },
];

function isCashierView(value: string | null): value is CashierView {
  return NAV.some((item) => item.id === value);
}

function CashierWorkspaceContent({
  userName,
  userRole,
}: {
  userName: string;
  userRole: UserRole;
}) {
  const searchParams = useSearchParams();
  const initialView = isCashierView(searchParams.get("view"))
    ? searchParams.get("view")
    : "payment";

  const [view, setView] = useState<CashierView>(initialView as CashierView);
  const [visited, setVisited] = useState<Set<CashierView>>(
    () => new Set([initialView as CashierView])
  );

  const navigate = useCallback((next: CashierView) => {
    setView(next);
    setVisited((prev) => new Set(prev).add(next));
  }, []);

  return (
    <WorkspaceShell
      theme="cashier"
      userName={userName}
      roleLabel={userRole === "ADMIN" ? "Administrator" : "Kassir"}
      navItems={NAV}
      activeView={view}
      onNavigate={navigate}
      fixedHeader={<CashierTopBar isActive />}
    >
      {visited.has("payment") && (
        <div className={view === "payment" ? "animate-fade-up space-y-6" : "hidden"}>
          <PageHeader
            icon={CreditCard}
            title="To'lov qabul qilish"
            description="Bemor ma'lumotlari, xizmatlar va to'lov turini kiriting"
            accent="emerald"
          />
          <PaymentForm />
        </div>
      )}
      {visited.has("debts") && (
        <div className={view === "debts" ? "animate-fade-up space-y-6" : "hidden"}>
          <DebtsView accent="emerald" showStats={false} isActive={view === "debts"} />
        </div>
      )}
      {visited.has("expenses") && (
        <div className={view === "expenses" ? "animate-fade-up space-y-6" : "hidden"}>
          <PageHeader
            icon={Wallet}
            title="Xarajatlar"
            description="Klinika chiqimlarini kiritish va kuzatish"
            accent="amber"
          />
          <ExpensesView showHeader={false} accent="emerald" defaultPeriod="day" />
        </div>
      )}
      {visited.has("report") && (
        <div className={view === "report" ? "animate-fade-up space-y-6" : "hidden"}>
          <PageHeader
            icon={BarChart3}
            title="Kunlik hisobot"
            description="Bugungi tushum, xarajat, qarzdorlik va sof foyda"
            accent="sky"
          />
          <CashierReportView isActive={view === "report"} />
        </div>
      )}
      {visited.has("receipts") && (
        <div className={view === "receipts" ? "animate-fade-up space-y-6" : "hidden"}>
          <PageHeader
            icon={Receipt}
            title="Cheklar"
            description="Kun, oy, yil bo'yicha qidirish va chop etish"
            accent="amber"
          />
          <ReceiptsView isActive={view === "receipts"} />
        </div>
      )}
    </WorkspaceShell>
  );
}

export function CashierWorkspace({
  userName,
  userRole,
}: {
  userName: string;
  userRole: UserRole;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Yuklanmoqda...
        </div>
      }
    >
      <CashierWorkspaceContent userName={userName} userRole={userRole} />
    </Suspense>
  );
}
