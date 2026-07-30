"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/kassa/ui/select";
import { getLocalDateString } from "@/lib/kassa/date";
import { cn } from "@/lib/kassa/utils";

type PeriodFilter = "day" | "month" | "year" | "all";

type AuditLogItem = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string;
  actorRole: string | null;
  message: string;
};

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "day", label: "Kunlik" },
  { value: "month", label: "Oylik" },
  { value: "year", label: "Yillik" },
  { value: "all", label: "Barchasi" },
];

type LogCategory = "income" | "expense" | "refund" | "correction" | "auth" | "admin" | "other";

const LOG_LEGEND: Array<{ category: LogCategory; label: string }> = [
  { category: "income", label: "Kirim / to'lov" },
  { category: "expense", label: "Chiqim / xarajat" },
  { category: "refund", label: "Pul qaytarish" },
  { category: "correction", label: "Tuzatish" },
  { category: "auth", label: "Kirish-chiqish" },
  { category: "admin", label: "Boshqaruv" },
];

const LOG_STYLES: Record<
  LogCategory,
  { container: string; badge: string; label: string }
> = {
  income: {
    label: "Kirim",
    container: "border-emerald-200 border-l-emerald-500 bg-emerald-50/70 text-emerald-950",
    badge: "bg-emerald-100 text-emerald-800",
  },
  expense: {
    label: "Chiqim",
    container: "border-amber-200 border-l-amber-500 bg-amber-50/70 text-amber-950",
    badge: "bg-amber-100 text-amber-800",
  },
  refund: {
    label: "Qaytarish",
    container: "border-sky-200 border-l-sky-500 bg-sky-50/70 text-sky-950",
    badge: "bg-sky-100 text-sky-800",
  },
  correction: {
    label: "Tuzatish",
    container: "border-violet-200 border-l-violet-500 bg-violet-50/70 text-violet-950",
    badge: "bg-violet-100 text-violet-800",
  },
  auth: {
    label: "Kirish",
    container: "border-slate-200 border-l-slate-400 bg-slate-50/80 text-slate-800",
    badge: "bg-slate-100 text-slate-700",
  },
  admin: {
    label: "Boshqaruv",
    container: "border-indigo-200 border-l-indigo-500 bg-indigo-50/70 text-indigo-950",
    badge: "bg-indigo-100 text-indigo-800",
  },
  other: {
    label: "Boshqa",
    container: "border-slate-200 border-l-slate-300 bg-white text-slate-800",
    badge: "bg-slate-100 text-slate-700",
  },
};

function getLogCategory(action: string): LogCategory {
  if (action === "INVOICE_CREATED" || action === "INVOICE_PAYMENT") return "income";
  if (action === "EXPENSE_CREATED" || action === "EXPENSE_PAYMENT") return "expense";
  if (action === "ADMIN_REFUND_INVOICE") return "refund";
  if (action.startsWith("ADMIN_CORRECT") || action === "ADMIN_CANCEL_DEBT") {
    return "correction";
  }
  if (action.startsWith("LOGIN") || action === "LOGOUT") return "auth";
  if (
    action.startsWith("USER_") ||
    action === "PASSWORD_RESET" ||
    action.startsWith("SERVICE_")
  ) {
    return "admin";
  }
  return "other";
}

function currentMonth() {
  return getLocalDateString().slice(0, 7);
}

function currentYear() {
  return String(new Date().getFullYear());
}

export function AuditLogsView({ isActive = true }: { isActive?: boolean }) {
  const [period, setPeriod] = useState<PeriodFilter>("day");
  const [dayDate, setDayDate] = useState(getLocalDateString());
  const [monthDate, setMonthDate] = useState(currentMonth());
  const [yearDate, setYearDate] = useState(currentYear());
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(() => {
    if (!isActive) return;

    const params = new URLSearchParams({ period });
    if (period === "day") params.set("date", dayDate);
    else if (period === "month") params.set("month", monthDate);
    else if (period === "year") params.set("year", yearDate);
    if (searchQuery) params.set("search", searchQuery);

    setLoading(true);
    setError("");
    fetch(`/api/kassa/admin/audit-logs?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Loglar yuklanmadi");
        setLogs(data.logs || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isActive, period, dayDate, monthDate, yearDate, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel = useMemo(() => {
    if (period === "day") {
      return new Date(`${dayDate}T12:00:00`).toLocaleDateString("uz-UZ", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    if (period === "month") {
      const [year, month] = monthDate.split("-");
      return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("uz-UZ", {
        month: "long",
        year: "numeric",
      });
    }
    if (period === "year") return `${yearDate} yil`;
    return "Barcha vaqt";
  }, [period, dayDate, monthDate, yearDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Harakatlar jurnali"
        description="Kassir va administrator amallari: kirim, chiqim, tuzatish va boshqa loglar"
        accent="violet"
      />

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">Filtr</CardTitle>
          <div className="grid gap-3 lg:grid-cols-[160px_180px_1fr_auto]">
            <div className="space-y-2">
              <Label>Davr</Label>
              <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {period === "day" && (
              <div className="space-y-2">
                <Label>Kun</Label>
                <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
              </div>
            )}
            {period === "month" && (
              <div className="space-y-2">
                <Label>Oy</Label>
                <Input
                  type="month"
                  value={monthDate}
                  onChange={(e) => setMonthDate(e.target.value)}
                />
              </div>
            )}
            {period === "year" && (
              <div className="space-y-2">
                <Label>Yil</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2100}
                  value={yearDate}
                  onChange={(e) => setYearDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Qidirish</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Kassir, bemor, summa..."
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={load} disabled={loading}>
                Yangilash
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{periodLabel}</CardTitle>
          <p className="text-sm text-muted-foreground">{logs.length} ta yozuv</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {LOG_LEGEND.map((item) => (
              <span
                key={item.category}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  LOG_STYLES[item.category].badge
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {loading ? (
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tanlangan davrda log topilmadi</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => {
                const category = getLogCategory(log.action);
                const style = LOG_STYLES[category];

                return (
                  <li
                    key={log.id}
                    className={cn(
                      "rounded-xl border border-l-4 px-4 py-3 text-sm leading-relaxed",
                      style.container
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          style.badge
                        )}
                      >
                        {style.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{log.actorName}</span>
                    </div>
                    <p>{log.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
