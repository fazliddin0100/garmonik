"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/kassa/ui/select";
import {
  FileDown,
  FileSpreadsheet,
  HandCoins,
  PieChart as PieChartIcon,
  Receipt,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { StatCard } from "@/components/kassa/ui/stat-card";
import { getClinicName } from "@/lib/kassa/receipt-branding";
import { formatPaidByMethodLabel } from "@/lib/kassa/debts";
import { exportReportExcel, exportReportPdf } from "@/lib/kassa/export-report";
import { formatDate, formatMoney } from "@/lib/kassa/utils";
import { chartMoneyFormatter } from "@/lib/kassa/chart-formatters";
import { formatUzDateRangeLabel, getLocalDateString } from "@/lib/kassa/date";
import { PERIOD_OPTIONS, PLATFORM_LABELS } from "./report-utils";
import { ReportDayCalendar } from "./report-day-calendar";
import {
  IncomePaymentsTable,
  PaymentMethodCards,
  ReportCategoryPicker,
  type ReportCategoryId,
} from "./report-category-picker";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#64748b"];

type ExpenseReport = {
  total: number;
  totalCommitted?: number;
  totalPaid?: number;
  transactionCount?: number;
  averagePayment?: number;
  byPlatform?: Record<string, { total: number; count: number }>;
  openDebt?: { count: number; total: number };
  paymentHistory?: Array<{
    id: string;
    amount: number;
    createdAt: string;
    payeeName?: string | null;
    category: string;
    categoryDetail?: string | null;
    paymentTypeName: string;
    createdByName: string;
  }>;
  categoryBreakdown: Array<{ name: string; amount: number }>;
  expenses: Array<{
    id: string;
    category: string;
    categoryDetail?: string | null;
    amount: { toString(): string };
    description?: string | null;
    date: string;
    createdBy: { fullName: string };
  }>;
};

export function ReportsDashboard() {
  const [period, setPeriod] = useState("day");
  const [rangeFrom, setRangeFrom] = useState(getLocalDateString);
  const [rangeTo, setRangeTo] = useState(getLocalDateString);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getLocalDateString().slice(0, 7)
  );
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<ReportCategoryId>("overview");

  const loadReport = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (period === "day") {
      params.set("from", rangeFrom);
      params.set("to", rangeTo);
    }

    fetch(`/api/kassa/reports?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, rangeFrom, rangeTo]);

  useEffect(() => {
    loadReport();
    window.addEventListener("focus", loadReport);
    return () => window.removeEventListener("focus", loadReport);
  }, [loadReport]);

  useEffect(() => {
    if (period !== "day") return;

    fetch(`/api/kassa/reports?period=month&date=${calendarMonth}-01`, { cache: "no-store" })
      .then((r) => r.json())
      .then((monthData) => {
        const series =
          (monthData.financialSeries as Array<{
            date: string;
            kirim: number;
            chiqim: number;
          }>) ?? [];
        setActivityDates(
          new Set(
            series
              .filter((row) => row.kirim > 0 || row.chiqim > 0)
              .map((row) => row.date)
          )
        );
      })
      .catch(() => setActivityDates(new Set()));
  }, [period, calendarMonth]);

  const periodDescription = useMemo(() => {
    if (period === "day") {
      return formatUzDateRangeLabel(rangeFrom, rangeTo);
    }
    return PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;
  }, [period, rangeFrom, rangeTo]);

  const handleViewMonthChange = useCallback((monthKey: string) => {
    setCalendarMonth(monthKey);
  }, []);

  if (loading && !data) {
    return <p className="text-muted-foreground">Yuklanmoqda...</p>;
  }

  if (!data) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        Hisobot yuklanmadi. Sahifani yangilab ko&apos;ring.
      </p>
    );
  }

  const revenue = data.revenue as {
    grandTotal: number;
    grossTotal?: number;
    refundTotal?: number;
    transactionCount: number;
    averagePayment: number;
    byPlatform: Record<string, { total: number; count: number }>;
    topServices: Array<{
      name: string;
      count: number;
      total: number;
      payers?: Array<{
        patientName: string;
        amount: number;
        invoiceNumber: number;
        paidAt: string;
        paymentMethod: string;
      }>;
    }>;
    customServices: Array<{ name: string; count: number; total: number }>;
    refundedServices?: Array<{
      name: string;
      count: number;
      total: number;
      refunds?: Array<{
        patientName: string;
        amount: number;
        invoiceNumber: number;
        refundedAt: string;
        paymentMethod: string;
      }>;
    }>;
    incomePayments?: Array<{
      id: string;
      patientName: string;
      amount: number;
      paymentMethod: string;
      platform: string;
      paidAt: string;
      invoiceNumber: number;
      servicesSummary: string;
    }>;
  };

  const expenses = (data.expenses as ExpenseReport) || {
    total: 0,
    categoryBreakdown: [],
    expenses: [],
  };

  const periodDebt =
    (data.periodDebt as { openInvoiceCount: number; totalDebt: number } | undefined) ??
    { openInvoiceCount: 0, totalDebt: 0 };

  const profit =
    (data.profit as number | undefined) ??
    revenue.grandTotal - expenses.total - periodDebt.totalDebt;

  const incomePayments = revenue.incomePayments ?? [];

  const incomePieData = Object.entries(revenue.byPlatform)
    .filter(([, v]) => v.total > 0)
    .map(([name, v]) => ({
      name: PLATFORM_LABELS[name] || name,
      value: v.total,
    }));

  const expensePieData = expenses.categoryBreakdown.map((c) => ({
    name: c.name,
    value: c.amount,
  }));

  const financialSeries =
    (data.financialSeries as Array<{
      date: string;
      kirim: number;
      chiqim: number;
      foyda: number;
    }>) || [];

  const hourly = (data.hourly as Array<{ hour: string; count: number }>) || [];
  const cashiers =
    (data.cashiers as Array<{ cashierName: string; total: number; count: number }>) || [];

  const incomePlatforms = Object.entries(revenue.byPlatform).filter(([, v]) => v.count > 0);

  const expensePlatforms = Object.entries(expenses.byPlatform ?? {}).filter(
    ([, v]) => v.count > 0
  );

  const debts = data.debts as
    | {
        stats: {
          totalPatients: number;
          debtorCount: number;
          openInvoiceCount: number;
          totalDebt: number;
          totalBilled: number;
          totalPaid: number;
        };
        debtors: Array<{
          patientId: string;
          fullName: string;
          phone: string | null;
          totalAmount: number;
          paidAmount: number;
          balanceDue: number;
          paidByMethod?: Array<{ method: string; amount: number }>;
        }>;
      }
    | undefined;

  const expenseByPlatform = expenses.byPlatform ?? {};

  const paymentMethodCount = new Set([
    ...Object.keys(revenue.byPlatform).filter((k) => (revenue.byPlatform[k]?.count ?? 0) > 0),
    ...Object.keys(expenseByPlatform).filter((k) => (expenseByPlatform[k]?.count ?? 0) > 0),
  ]).size;

  const servicesCount =
    revenue.topServices.length +
    (revenue.customServices?.length ?? 0) +
    (revenue.refundedServices?.length ?? 0);

  const totalDebtAmount =
    (debts?.stats.totalDebt ?? 0) + periodDebt.totalDebt;

  const categorySummaries: Record<ReportCategoryId, string> = {
    overview: formatMoney(profit),
    income: formatMoney(revenue.grandTotal),
    expense: formatMoney(expenses.total),
    debt: formatMoney(totalDebtAmount),
    payments: `${paymentMethodCount} ta usul`,
    services: `${servicesCount} ta`,
  };

  const showOverview = activeCategory === "overview";
  const showIncome = activeCategory === "income" || showOverview;
  const showExpense = activeCategory === "expense" || showOverview;
  const showDebt = activeCategory === "debt" || showOverview;
  const showServices = activeCategory === "services" || showOverview;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          icon={PieChartIcon}
          title="Moliyaviy hisobotlar"
          description={
            period === "day"
              ? `${periodDescription} — kunlik hisobot`
              : "Kirim, chiqim va foyda tahlili"
          }
          accent="violet"
          className="mb-0"
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportReportExcel(
                data as Parameters<typeof exportReportExcel>[0],
                getClinicName()
              )
            }
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportReportPdf(
                data as Parameters<typeof exportReportPdf>[0],
                getClinicName()
              )
            }
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Select
            value={period}
            onValueChange={(v) => {
              setPeriod(v);
              if (v === "day") {
                const today = getLocalDateString();
                setRangeFrom(today);
                setRangeTo(today);
              }
            }}
          >
            <SelectTrigger className="w-40 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ReportCategoryPicker
        active={activeCategory}
        onChange={setActiveCategory}
        summaries={categorySummaries}
      />

      {period === "day" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <ReportDayCalendar
            mode="range"
            selected={rangeFrom}
            rangeTo={rangeTo}
            onRangeChange={(from, to) => {
              setRangeFrom(from);
              setRangeTo(to);
            }}
            activityDates={activityDates}
            onViewMonthChange={handleViewMonthChange}
            hint="Birinchi va oxirgi kuni tanlang — oralig'idagi moliyaviy hisobot ko'rsatiladi."
            activityHint="— kirim yoki chiqim bor kunlar"
          />
          <Card className="border-violet-100 bg-gradient-to-br from-violet-50/80 to-white">
            <CardHeader>
              <CardTitle className="text-base text-violet-900">
                {periodDescription}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tanlangan davr uchun qisqa xulosa
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <SummaryItem
                label="Kirim"
                value={formatMoney(revenue.grandTotal)}
              />
              <SummaryItem label="Chiqim" value={formatMoney(expenses.total)} />
              <SummaryItem
                label="Davr qarzi"
                value={formatMoney(periodDebt.totalDebt)}
              />
              <SummaryItem
                label="Sof foyda"
                value={formatMoney(profit)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground">Hisobot yangilanmoqda...</p>
      )}

      {showOverview && (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Kirim (tushum)" value={formatMoney(revenue.grandTotal)} icon={TrendingUp} variant="emerald" />
        <StatCard label="Chiqim (xarajat)" value={formatMoney(expenses.total)} icon={TrendingDown} variant="amber" />
        <StatCard
          label="Davr qarzdorligi"
          value={formatMoney(periodDebt.totalDebt)}
          icon={HandCoins}
          variant="rose"
        />
        <StatCard
          label="Sof foyda / zarar"
          value={formatMoney(profit)}
          icon={PieChartIcon}
          variant={profit >= 0 ? "emerald" : "rose"}
          negative={profit < 0}
        />
        <StatCard label="Tranzaksiyalar" value={String(revenue.transactionCount)} icon={Receipt} variant="violet" />
        {debts && (
          <StatCard
            label="Bemor qarzi"
            value={formatMoney(debts.stats.totalDebt)}
            icon={HandCoins}
            variant="rose"
            delay={240}
          />
        )}
      </div>
      )}

      {showIncome && (
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardHeader>
          <CardTitle className="text-base text-emerald-800">Kirim — to&apos;liq hisobot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryItem label="Jami kirim (sof)" value={formatMoney(revenue.grandTotal)} />
            {(revenue.refundTotal ?? 0) > 0 && (
              <SummaryItem
                label="Qaytarilgan"
                value={formatMoney(revenue.refundTotal ?? 0)}
              />
            )}
            <SummaryItem label="Tranzaksiyalar" value={String(revenue.transactionCount)} />
            <SummaryItem label="O&apos;rtacha to&apos;lov" value={formatMoney(revenue.averagePayment)} />
          </div>
          <ul className="divide-y rounded-lg border bg-white">
            {incomePlatforms.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">Kirim yo&apos;q</li>
            ) : (
              incomePlatforms.map(([platform, v]) => (
                <li key={platform} className="flex justify-between p-3 text-sm">
                  <span>{PLATFORM_LABELS[platform] || platform}</span>
                  <span className="font-semibold">
                    {formatMoney(v.total)} ({v.count} ta)
                  </span>
                </li>
              ))
            )}
          </ul>
          <IncomePaymentsTable payments={incomePayments} />
        </CardContent>
      </Card>
      )}

      {showExpense && (
      <Card className="border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="text-base text-orange-800">Chiqim — to&apos;liq hisobot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Haqiqiy chiqim (to'langan)" value={formatMoney(expenses.total)} />
            <SummaryItem
              label="Tranzaksiyalar"
              value={String(expenses.transactionCount ?? 0)}
            />
            {(expenses.averagePayment ?? 0) > 0 && (
              <SummaryItem
                label="O'rtacha to'lov"
                value={formatMoney(expenses.averagePayment ?? 0)}
              />
            )}
            {expenses.totalCommitted != null && (
              <SummaryItem
                label="Jami xarajat (majburiyat)"
                value={formatMoney(expenses.totalCommitted)}
              />
            )}
            {expenses.openDebt && expenses.openDebt.total > 0 && (
              <SummaryItem
                label="Ochiq xarajat qarzi"
                value={formatMoney(expenses.openDebt.total)}
              />
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-orange-900">To&apos;lov usullari</p>
            <ul className="divide-y rounded-lg border bg-white">
              {expensePlatforms.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">To&apos;lov yo&apos;q</li>
              ) : (
                expensePlatforms.map(([platform, v]) => (
                  <li key={platform} className="flex justify-between p-3 text-sm">
                    <span>{PLATFORM_LABELS[platform] || platform}</span>
                    <span className="font-semibold">
                      {formatMoney(v.total)} ({v.count} ta)
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-orange-900">Kategoriyalar</p>
            <ul className="divide-y rounded-lg border bg-white">
            {expenses.categoryBreakdown.length === 0 ? (
              <li className="p-3 text-sm text-muted-foreground">Chiqim yo&apos;q</li>
            ) : (
              expenses.categoryBreakdown.map((c) => (
                <li key={c.name} className="flex justify-between p-3 text-sm">
                  <span>{c.name}</span>
                  <span className="font-semibold">{formatMoney(c.amount)}</span>
                </li>
              ))
            )}
          </ul>
          </div>
          {expenses.paymentHistory && expenses.paymentHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-orange-900">
                To&apos;lovlar tarixi (davrdagi)
              </p>
              <ul className="divide-y rounded-lg border bg-white text-sm">
                {expenses.paymentHistory.map((p) => (
                  <li key={p.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-medium">
                        {p.payeeName || p.category}
                        {p.categoryDetail ? ` (${p.categoryDetail})` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.createdAt)} · {p.createdByName}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-orange-800">{formatMoney(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{p.paymentTypeName}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {activeCategory === "payments" && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-base text-blue-900">
              To&apos;lov turlari — har bir usul alohida
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {periodDescription} · Naqt, karta, Click va boshqalar bo&apos;yicha kirim va chiqim
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <PaymentMethodCards
              revenueByPlatform={revenue.byPlatform}
              expenseByPlatform={expenseByPlatform}
              platformLabels={PLATFORM_LABELS}
              incomePayments={incomePayments}
            />
            <IncomePaymentsTable
              payments={incomePayments}
              title="Barcha kirim to'lovlari — kim, nima uchun, qaysi usul"
            />
          </CardContent>
        </Card>
      )}

      {(showOverview || activeCategory === "income" || activeCategory === "expense") && (
      <div className="grid gap-6 lg:grid-cols-2">
        {(showOverview || activeCategory === "income") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kirim — to&apos;lov turlari</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {incomePieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={incomePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {incomePieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={chartMoneyFormatter} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        )}

        {(showOverview || activeCategory === "expense") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chiqim — kategoriyalar</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {expensePieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {expensePieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={chartMoneyFormatter} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        )}

        {showOverview && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Kirim va chiqim dinamikasi</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {financialSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={financialSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={chartMoneyFormatter} />
                  <Legend />
                  <Line type="monotone" dataKey="kirim" name="Kirim" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="chiqim" name="Chiqim" stroke="#f97316" strokeWidth={2} />
                  <Line type="monotone" dataKey="foyda" name="Foyda" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        )}

        {showOverview && hourly.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bandlik soatlari</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {(showOverview || activeCategory === "income") && cashiers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kassirlar taqqoslash (kirim)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {cashiers.map((c) => (
                  <li key={c.cashierName} className="flex justify-between rounded-lg border p-3">
                    <span>{c.cashierName}</span>
                    <span className="font-semibold">
                      {formatMoney(c.total)} ({c.count} ta)
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {showServices && revenue.customServices?.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/20">
          <CardHeader>
            <CardTitle className="text-base text-violet-900">
              Ro&apos;yxatda yo&apos;q xizmatlar (qo&apos;shimcha kirim)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y rounded-lg border bg-white">
              {revenue.customServices.map((s) => (
                <li key={s.name} className="flex justify-between py-2.5 px-3 text-sm">
                  <span>
                    {s.name} <span className="text-muted-foreground">({s.count} ta)</span>
                  </span>
                  <span className="font-semibold text-violet-800">{formatMoney(s.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {showServices && (revenue.refundedServices?.length ?? 0) > 0 && (
        <Card className="border-rose-200 bg-rose-50/20">
          <CardHeader>
            <CardTitle className="text-base text-rose-900">
              Qaytarilgan pullar (xizmatlar bo&apos;yicha)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Davr ichida bemorga qaytarilgan summalar — kirim hisobidan ayirilgan
            </p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {revenue.refundedServices!.map((s) => (
                <li key={s.name} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} ta qaytarish</p>
                    </div>
                    <span className="shrink-0 font-semibold text-rose-700">
                      {formatMoney(s.total)}
                    </span>
                  </div>
                  {s.refunds && s.refunds.length > 0 && (
                    <div className="mt-3 overflow-x-auto rounded-lg border bg-white/80">
                      <table className="w-full min-w-[520px] text-xs">
                        <thead className="border-b bg-rose-50/50 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Bemor</th>
                            <th className="px-3 py-2 font-medium">Chek</th>
                            <th className="px-3 py-2 font-medium">Sana</th>
                            <th className="px-3 py-2 font-medium">Usul</th>
                            <th className="px-3 py-2 text-right font-medium">Qaytarildi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {s.refunds.map((refund, refundIndex) => (
                            <tr key={`${refund.invoiceNumber}-${refund.refundedAt}-${refundIndex}`}>
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {refund.patientName}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                #{refund.invoiceNumber}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {formatDate(refund.refundedAt)}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {refund.paymentMethod}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-rose-700">
                                {formatMoney(refund.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {showServices && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top-10 xizmatlar (kirim)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {revenue.topServices.length === 0 ? (
              <li className="py-2 text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</li>
            ) : (
              revenue.topServices.map((s, i) => (
                <li key={s.name} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {i + 1}. {s.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.count} ta</p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatMoney(s.total)}</span>
                  </div>
                  {s.payers && s.payers.length > 0 && (
                    <div className="mt-3 overflow-x-auto rounded-lg border bg-slate-50/60">
                      <table className="w-full min-w-[520px] text-xs">
                        <thead className="border-b bg-white text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 font-medium">Bemor</th>
                            <th className="px-3 py-2 font-medium">Chek</th>
                            <th className="px-3 py-2 font-medium">Sana</th>
                            <th className="px-3 py-2 font-medium">To&apos;lov usuli</th>
                            <th className="px-3 py-2 text-right font-medium">Summa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y bg-white">
                          {s.payers.map((payer, payerIndex) => (
                            <tr key={`${payer.invoiceNumber}-${payer.paidAt}-${payerIndex}`}>
                              <td className="px-3 py-2 font-medium text-slate-800">
                                {payer.patientName}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                #{payer.invoiceNumber}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {formatDate(payer.paidAt)}
                              </td>
                              <td className="px-3 py-2 text-muted-foreground">
                                {payer.paymentMethod}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                                {formatMoney(payer.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>
      )}

      {activeCategory === "debt" && (
        <Card className="border-rose-100 bg-rose-50/30">
          <CardHeader>
            <CardTitle className="text-base text-rose-900">Davr qarzdorligi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <SummaryItem label="Davr ichidagi ochiq qarz" value={formatMoney(periodDebt.totalDebt)} />
            <SummaryItem label="Ochiq cheklar" value={String(periodDebt.openInvoiceCount)} />
            <SummaryItem
              label="Jami qarzdorlik"
              value={formatMoney(totalDebtAmount)}
            />
          </CardContent>
        </Card>
      )}

      {showDebt && debts && <DebtsReportSection debts={debts} />}
    </div>
  );
}

function DebtsReportSection({
  debts,
}: {
  debts: {
    stats: {
      totalPatients: number;
      debtorCount: number;
      openInvoiceCount: number;
      totalDebt: number;
    };
    debtors: Array<{
      patientId: string;
      fullName: string;
      phone: string | null;
      totalAmount: number;
      paidAmount: number;
      balanceDue: number;
      paidByMethod?: Array<{ method: string; amount: number }>;
    }>;
  };
}) {
  return (
    <Card className="border-rose-200 bg-rose-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-rose-800">
          <HandCoins className="h-5 w-5" />
          Qarzdorlik — joriy holat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="Jami bemorlar" value={String(debts.stats.totalPatients)} />
          <SummaryItem label="Qarzdorlar" value={String(debts.stats.debtorCount)} />
          <SummaryItem label="Jami qarzdorlik" value={formatMoney(debts.stats.totalDebt)} />
          <SummaryItem label="Ochiq cheklar" value={String(debts.stats.openInvoiceCount)} />
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b bg-rose-50/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Bemor</th>
                <th className="p-3 font-medium">Telefon</th>
                <th className="p-3 font-medium text-right">Jami</th>
                <th className="p-3 font-medium text-right">To&apos;langan</th>
                <th className="p-3 font-medium">To&apos;lov usuli</th>
                <th className="p-3 font-medium text-right">Qoldiq</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {debts.debtors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    Hozircha qarzdorlar yo&apos;q
                  </td>
                </tr>
              ) : (
                debts.debtors.map((d) => (
                  <tr key={d.patientId} className="hover:bg-rose-50/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2 font-medium">
                        <UserRound className="h-4 w-4 text-rose-400" />
                        {d.fullName}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{d.phone || "—"}</td>
                    <td className="p-3 text-right">{formatMoney(d.totalAmount)}</td>
                    <td className="p-3 text-right text-emerald-700">
                      {formatMoney(d.paidAmount)}
                    </td>
                    <td className="p-3 text-xs text-emerald-700">
                      {formatPaidByMethodLabel(d.paidByMethod ?? [])}
                    </td>
                    <td className="p-3 text-right font-semibold text-rose-600">
                      {formatMoney(d.balanceDue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
