"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  Calculator,
  CreditCard,
  HandCoins,
  PieChart,
  Receipt,
  Smartphone,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { StatCard } from "@/components/kassa/ui/stat-card";
import { formatMoney } from "@/lib/kassa/utils";
import { PLATFORM_LABELS } from "@/components/kassa/reports/report-utils";
import { KASSA_PAYMENT_COMPLETED } from "@/lib/kassa/kassa-events";

const PLATFORM_STYLE: Record<string, { icon: typeof Banknote; gradient: string }> = {
  CASH: { icon: Banknote, gradient: "from-emerald-500 to-teal-600" },
  HUMO: { icon: CreditCard, gradient: "from-blue-500 to-indigo-600" },
  VISA: { icon: CreditCard, gradient: "from-indigo-500 to-violet-600" },
  UZCARD: { icon: CreditCard, gradient: "from-sky-500 to-blue-600" },
  TERMINAL: { icon: CreditCard, gradient: "from-slate-500 to-slate-700" },
  CLICK: { icon: Smartphone, gradient: "from-cyan-500 to-teal-600" },
  PAYME: { icon: Smartphone, gradient: "from-violet-500 to-purple-600" },
};

type ReportData = {
  revenue: {
    grandTotal: number;
    transactionCount: number;
    averagePayment: number;
    byPlatform: Record<string, { total: number; count: number }>;
    topServices: Array<{ name: string; count: number; total: number }>;
    customServices: Array<{ name: string; count: number; total: number }>;
  };
  expenses: { total: number };
  periodDebt: { totalDebt: number; openInvoiceCount: number };
  profit?: number;
};

export function CashierReportView({ isActive = true }: { isActive?: boolean }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isActive) return;

    function loadReport() {
      fetch("/api/kassa/reports?period=day")
        .then(async (r) => {
          const json = await r.json();
          if (!r.ok) {
            throw new Error(json.error || "Hisobot yuklanmadi");
          }
          if (!json.revenue) {
            throw new Error("Hisobot ma'lumotlari topilmadi");
          }
          return json as ReportData;
        })
        .then((report) => {
          setData(report);
          setError("");
        })
        .catch((e: Error) => {
          setData(null);
          setError(e.message || "Hisobot yuklanmadi");
        });
    }

    loadReport();
    window.addEventListener(KASSA_PAYMENT_COMPLETED, loadReport);
    return () => window.removeEventListener(KASSA_PAYMENT_COMPLETED, loadReport);
  }, [isActive]);

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-shimmer rounded-2xl" />
          ))}
        </div>
        <div className="h-48 animate-shimmer rounded-2xl" />
      </div>
    );
  }

  const { revenue } = data;
  const expensesTotal = data.expenses?.total ?? 0;
  const periodDebtTotal = data.periodDebt?.totalDebt ?? 0;
  const profit =
    data.profit ?? revenue.grandTotal - expensesTotal - periodDebtTotal;

  const platforms = Object.entries(revenue.byPlatform).filter(([, v]) => v.count > 0);
  const topServices = revenue.topServices ?? [];
  const customServices = revenue.customServices ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bugungi tushum"
          value={formatMoney(revenue.grandTotal)}
          icon={TrendingUp}
          variant="emerald"
          delay={0}
        />
        <StatCard
          label="Bugungi xarajat"
          value={formatMoney(expensesTotal)}
          icon={TrendingDown}
          variant="amber"
          delay={60}
        />
        <StatCard
          label="Bugungi qarzdorlik"
          value={formatMoney(periodDebtTotal)}
          icon={HandCoins}
          variant="rose"
          delay={120}
        />
        <StatCard
          label="Sof foyda"
          value={formatMoney(profit)}
          icon={PieChart}
          variant={profit >= 0 ? "emerald" : "rose"}
          negative={profit < 0}
          delay={180}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Tranzaksiyalar"
          value={String(revenue.transactionCount)}
          icon={Receipt}
          variant="violet"
          delay={220}
        />
        <StatCard
          label="O'rtacha to'lov"
          value={formatMoney(revenue.averagePayment)}
          icon={Calculator}
          variant="sky"
          delay={260}
        />
      </div>

      <Card className="overflow-hidden border-sky-100">
        <CardHeader className="border-b border-sky-50 bg-gradient-to-r from-sky-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <CardTitle>To&apos;lov turlari bo&apos;yicha</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {platforms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center text-sm text-muted-foreground">
              Bugun hali to&apos;lov qabul qilinmagan
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map(([platform, v], i) => {
                const style = PLATFORM_STYLE[platform] ?? {
                  icon: CreditCard,
                  gradient: "from-slate-500 to-slate-700",
                };
                const Icon = style.icon;
                return (
                  <div
                    key={platform}
                    className="animate-fade-up group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-100 hover:shadow-md"
                    style={{ animationDelay: `${180 + i * 50}ms` }}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${style.gradient}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-600">
                        {PLATFORM_LABELS[platform] || platform}
                      </p>
                      <p className="text-lg font-bold text-slate-900">{formatMoney(v.total)}</p>
                      <p className="text-xs text-muted-foreground">{v.count} ta tranzaksiya</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {customServices.length > 0 && (
        <Card className="overflow-hidden border-violet-100">
          <CardHeader className="border-b border-violet-50 bg-gradient-to-r from-violet-50/80 to-white">
            <CardTitle>Ro&apos;yxatda yo&apos;q xizmatlar (qo&apos;shimcha)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="divide-y rounded-xl border bg-white">
              {customServices.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.count} ta</p>
                  </div>
                  <span className="font-semibold text-violet-700">{formatMoney(s.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-emerald-100">
        <CardHeader className="border-b border-emerald-50 bg-gradient-to-r from-emerald-50/80 to-white">
          <CardTitle>Xizmatlar bo&apos;yicha (kirim)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {topServices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center text-sm text-muted-foreground">
              Bugun xizmatlar bo&apos;yicha ma&apos;lumot yo&apos;q
            </div>
          ) : (
            <ul className="divide-y rounded-xl border bg-white">
              {topServices.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.count} ta</p>
                  </div>
                  <span className="font-semibold text-emerald-700">{formatMoney(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
