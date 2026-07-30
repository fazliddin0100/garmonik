"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Receipt, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/kassa/utils";
import { formatUzDateLong } from "@/lib/kassa/date";
import { KASSA_PAYMENT_COMPLETED } from "@/lib/kassa/kassa-events";

type DayStats = {
  revenue: number;
  count: number;
};

export function CashierTopBar({ isActive = true }: { isActive?: boolean }) {
  const [stats, setStats] = useState<DayStats | null>(null);
  const [todayLabel, setTodayLabel] = useState(() => formatUzDateLong());

  useEffect(() => {
    if (!isActive) return;

    function loadStats() {
      fetch("/api/kassa/reports?period=day")
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok || !data.revenue) {
            throw new Error("stats unavailable");
          }
          const revenue = data.revenue as { grandTotal: number; transactionCount: number };
          setStats({
            revenue: revenue.grandTotal,
            count: revenue.transactionCount,
          });
        })
        .catch(() => setStats({ revenue: 0, count: 0 }));
    }

    function refresh() {
      setTodayLabel(formatUzDateLong());
      loadStats();
    }

    refresh();
    window.addEventListener(KASSA_PAYMENT_COMPLETED, refresh);
    const midnightTimer = setInterval(() => setTodayLabel(formatUzDateLong()), 60_000);
    return () => {
      window.removeEventListener(KASSA_PAYMENT_COMPLETED, refresh);
      clearInterval(midnightTimer);
    };
  }, [isActive]);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/40 to-teal-50/60 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Bugungi smena
            </p>
            <p className="text-sm font-medium capitalize text-slate-700">{todayLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-white/80 px-4 py-2.5 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Tushum
              </p>
              <p className="text-base font-bold text-emerald-700">
                {stats ? formatMoney(stats.revenue) : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-teal-100 bg-white/80 px-4 py-2.5 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Cheklar
              </p>
              <p className="text-base font-bold text-teal-700">
                {stats ? `${stats.count} ta` : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
