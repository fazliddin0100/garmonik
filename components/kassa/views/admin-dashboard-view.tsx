"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  HandCoins,
  LayoutDashboard,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { StatCard } from "@/components/kassa/ui/stat-card";
import { formatMoney } from "@/lib/kassa/utils";
import type { AdminView } from "@/components/kassa/admin/types";

type Stats = {
  revenue: number;
  expenses: number;
  invoiceCount: number;
  profit: number;
  debtStats?: {
    debtorCount: number;
    totalDebt: number;
  };
};

const QUICK_ACTIONS: {
  view: AdminView;
  label: string;
  desc: string;
  icon: typeof Wallet;
  gradient: string;
}[] = [
  {
    view: "reports",
    label: "Hisobotlar",
    desc: "Kirim, chiqim va grafiklar",
    icon: BarChart3,
    gradient: "from-violet-500 to-indigo-600",
  },
  {
    view: "debts",
    label: "Qarzdorlik",
    desc: "Qisman to'lovlar va ochiq qarzlar",
    icon: HandCoins,
    gradient: "from-rose-500 to-orange-600",
  },
  {
    view: "expenses",
    label: "Xarajatlar",
    desc: "Chiqimlarni kiritish",
    icon: TrendingDown,
    gradient: "from-amber-500 to-orange-600",
  },
];

export function AdminDashboardView({
  onNavigate,
}: {
  onNavigate: (view: AdminView) => void;
}) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    function loadStats() {
      fetch("/api/kassa/admin/stats")
        .then((r) => r.json())
        .then(setStats);
    }

    loadStats();
    window.addEventListener("focus", loadStats);
    return () => window.removeEventListener("focus", loadStats);
  }, []);

  if (!stats) {
    return (
      <div className="animate-fade-in space-y-4">
        <div className="h-10 w-64 animate-shimmer rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-shimmer rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Boshqaruv paneli"
        description="Bugungi moliyaviy ko'rsatkichlar va tez harakatlar"
        accent="violet"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Bugungi tushum"
          value={formatMoney(stats.revenue)}
          icon={TrendingUp}
          variant="emerald"
          delay={0}
        />
        <StatCard
          label="Tranzaksiyalar"
          value={String(stats.invoiceCount)}
          icon={Wallet}
          variant="violet"
          delay={60}
        />
        <StatCard
          label="Bugungi xarajat"
          value={formatMoney(stats.expenses)}
          icon={TrendingDown}
          variant="amber"
          delay={120}
        />
        <StatCard
          label="Sof foyda (bugun)"
          value={formatMoney(stats.profit)}
          icon={BarChart3}
          variant={stats.profit >= 0 ? "emerald" : "rose"}
          delay={180}
          negative={stats.profit < 0}
        />
      </div>

      {stats.debtStats && stats.debtStats.debtorCount > 0 && (
        <div className="mt-6 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/80 to-orange-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-rose-800">Ochiq qarzdorlik</p>
              <p className="mt-1 text-2xl font-bold text-rose-700">
                {formatMoney(stats.debtStats.totalDebt)}
              </p>
              <p className="text-sm text-rose-600">
                {stats.debtStats.debtorCount} ta bemor qarzdor
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("debts")}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Qarzdorlikni ko&apos;rish
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={action.view}
              type="button"
              onClick={() => onNavigate(action.view)}
              className="animate-fade-up group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${240 + i * 80}ms` }}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${action.gradient}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{action.label}</p>
                <p className="text-sm text-muted-foreground">{action.desc}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-violet-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
