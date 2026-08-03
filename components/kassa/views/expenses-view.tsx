"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, FileDown, FileSpreadsheet, Wallet } from "lucide-react";
import { Button } from "@/components/kassa/ui/button";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { StatCard } from "@/components/kassa/ui/stat-card";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Badge } from "@/components/kassa/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/kassa/ui/select";
import {
  EXPENSE_CATEGORIES,
  OTHER_EXPENSE_CATEGORY,
  getExpenseCategoryLabel,
} from "@/lib/kassa/expenses";
import { exportExpensesExcel, exportExpensesPdf } from "@/lib/kassa/export-expenses";
import { getClinicName } from "@/lib/kassa/receipt-branding";
import { formatUzDateRangeLabel, getLocalDateString } from "@/lib/kassa/date";
import { ReportDayCalendar } from "@/components/kassa/reports/report-day-calendar";
import { PaymentMethodPicker } from "@/components/kassa/payment/payment-method-picker";
import { formatMoney, toNumber, cn } from "@/lib/kassa/utils";
import { chartMoneyFormatter } from "@/lib/kassa/chart-formatters";

type PaymentType = {
  id: string;
  name: string;
  platform: string;
  requiresGateway?: boolean;
  gatewayConfigured?: boolean;
};

type ExpensePayment = {
  id: string;
  amount: { toString(): string };
  createdAt: string;
  paymentType: { name: string };
  createdBy: { fullName: string };
};

type Expense = {
  id: string;
  category: string;
  categoryDetail?: string | null;
  amount: { toString(): string };
  amountPaid: { toString(): string };
  balanceDue: { toString(): string };
  payeeName?: string | null;
  status: "PAID" | "PARTIALLY_PAID";
  description?: string | null;
  date: string;
  createdBy: { fullName: string };
  paymentType?: { id: string; name: string; platform: string } | null;
  payments?: ExpensePayment[];
};

type DebtStats = {
  openExpenseCount: number;
  payeeCount: number;
  totalDebt: number;
};

type PeriodFilter = "day" | "month" | "year" | "all";

const CHART_COLORS = [
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#06b6d4",
  "#64748b",
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "day", label: "Kun" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
  { value: "all", label: "Barchasi" },
];

function currentMonth() {
  return getLocalDateString().slice(0, 7);
}

function currentYear() {
  return String(new Date().getFullYear());
}

export function ExpensesView({
  showHeader = true,
  accent = "amber",
  defaultPeriod = "day",
}: {
  showHeader?: boolean;
  accent?: "amber" | "emerald" | "violet";
  defaultPeriod?: PeriodFilter;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([...EXPENSE_CATEGORIES]);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [categoryDetail, setCategoryDetail] = useState("");
  const [amount, setAmount] = useState("");
  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>(defaultPeriod);
  const [rangeFrom, setRangeFrom] = useState(getLocalDateString());
  const [rangeTo, setRangeTo] = useState(getLocalDateString());
  const [monthDate, setMonthDate] = useState(currentMonth());
  const [yearDate, setYearDate] = useState(currentYear());
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [paymentTypeId, setPaymentTypeId] = useState("");
  const [debtStats, setDebtStats] = useState<DebtStats | null>(null);
  const [payingExpense, setPayingExpense] = useState<Expense | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState("");
  const [debtPaymentTypeId, setDebtPaymentTypeId] = useState("");
  const [debtPayLoading, setDebtPayLoading] = useState(false);
  const [debtPayError, setDebtPayError] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const isOtherCategory = category === OTHER_EXPENSE_CATEGORY;

  useEffect(() => {
    fetch("/api/kassa/payment-types")
      .then((r) => r.json())
      .then((pt) => {
        if (!Array.isArray(pt)) return;
        setPaymentTypes(pt);
        const cash = pt.find((p: PaymentType) => p.platform === "CASH") || pt[0];
        if (cash) {
          setPaymentTypeId((prev) => prev || cash.id);
          setDebtPaymentTypeId((prev) => prev || cash.id);
        }
      });
  }, []);

  const load = useCallback(
    (opts?: {
      period?: PeriodFilter;
      from?: string;
      to?: string;
      month?: string;
      year?: string;
    }) => {
      const activePeriod = opts?.period ?? period;
      const params = new URLSearchParams();
      if (activePeriod === "day") {
        params.set("from", opts?.from ?? rangeFrom);
        params.set("to", opts?.to ?? rangeTo);
      } else if (activePeriod === "month") {
        params.set("month", opts?.month ?? monthDate);
      } else if (activePeriod === "year") {
        params.set("year", opts?.year ?? yearDate);
      }

      setListLoading(true);
      setFilterCategory(null);
      fetch(`/api/kassa/expenses?${params.toString()}`, { cache: "no-store" })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) {
            setError(d.error || "Xarajatlar yuklanmadi");
            return;
          }
          setExpenses(d.expenses || []);
          setDebtStats(d.debtStats || null);
          if (Array.isArray(d.categories) && d.categories.length > 0) {
            setCategories(d.categories);
            setCategory((prev) =>
              prev && d.categories.includes(prev) ? prev : d.categories[0]
            );
          }
        })
        .catch(() => setError("Xarajatlar yuklanmadi"))
        .finally(() => setListLoading(false));
    },
    [period, rangeFrom, rangeTo, monthDate, yearDate]
  );

  useEffect(() => {
    load();
  }, [load]);

  function handleCategoryChange(value: string) {
    setCategory(value);
    if (value !== OTHER_EXPENSE_CATEGORY) {
      setCategoryDetail("");
    }
  }

  const totalAmount = parseFloat(amount || "0");
  const paidNow = parseFloat(amountPaidInput || amount || "0");
  const willHaveDebt =
    totalAmount > 0 && paidNow > 0 && paidNow < totalAmount;
  const remainingAfterCreate = willHaveDebt ? totalAmount - paidNow : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isOtherCategory && !categoryDetail.trim()) {
      setError("Boshqa xarajat turini kiriting");
      return;
    }
    if (!paymentTypeId) {
      setError("To'lov turini tanlang");
      return;
    }
    if (totalAmount <= 0) {
      setError("Jami summa 0 dan katta bo'lishi kerak");
      return;
    }
    if (paidNow <= 0) {
      setError("To'langan summa 0 dan katta bo'lishi kerak");
      return;
    }
    if (paidNow > totalAmount) {
      setError("To'langan summa jami xarajatdan oshmasligi kerak");
      return;
    }
    if (willHaveDebt && !payeeName.trim()) {
      setError("Qisman to'lov uchun kimga qarz ekanligini kiriting");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/kassa/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        categoryDetail: isOtherCategory ? categoryDetail.trim() : undefined,
        amount: totalAmount,
        amountPaid: paidNow,
        payeeName: willHaveDebt ? payeeName.trim() : undefined,
        description,
        date,
        paymentTypeId,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Saqlashda xatolik");
      setLoading(false);
      return;
    }

    setAmount("");
    setAmountPaidInput("");
    setPayeeName("");
    setDescription("");
    setCategoryDetail("");
    setLoading(false);
    if (period === "day") {
      setRangeFrom(date);
      setRangeTo(date);
      load({ period: "day", from: date, to: date });
    } else {
      load();
    }
  }

  const debtPaymentType = paymentTypes.find((p) => p.id === debtPaymentTypeId);
  const isDebtCash = debtPaymentType?.platform === "CASH";
  const debtBalance = payingExpense ? toNumber(payingExpense.balanceDue) : 0;
  const debtPaidInput = parseFloat(debtPayAmount || "0");
  const debtChange = isDebtCash ? Math.max(0, debtPaidInput - debtBalance) : 0;

  async function submitDebtPayment() {
    if (!payingExpense) return;
    setDebtPayError("");

    if (!debtPaymentTypeId) {
      setDebtPayError("To'lov turini tanlang");
      return;
    }
    if (debtPaidInput <= 0) {
      setDebtPayError("To'lov summasini kiriting");
      return;
    }
    if (!isDebtCash && debtPaidInput > debtBalance) {
      setDebtPayError(`Maksimal to'lov: ${formatMoney(debtBalance)}`);
      return;
    }

    setDebtPayLoading(true);
    try {
      const res = await fetch(`/api/kassa/expenses/${payingExpense.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentTypeId: debtPaymentTypeId,
          amountPaid: debtPaidInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDebtPayError(data.error || "To'lov saqlanmadi");
        return;
      }
      setPayingExpense(null);
      setDebtPayAmount("");
      load();
    } finally {
      setDebtPayLoading(false);
    }
  }

  const filteredExpenses = useMemo(() => {
    if (!filterCategory) return expenses;
    return expenses.filter((e) => e.category === filterCategory);
  }, [expenses, filterCategory]);

  const categorySummary = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const e of expenses) {
      const key = e.category;
      const cur = map.get(key) ?? { amount: 0, count: 0 };
      cur.amount += toNumber(e.amount);
      cur.count += 1;
      map.set(key, cur);
    }
    const keys = new Set<string>([...categories, ...map.keys()]);
    return Array.from(keys)
      .map((key) => ({
        key,
        name: key,
        amount: map.get(key)?.amount ?? 0,
        count: map.get(key)?.count ?? 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, categories]);

  const total = filteredExpenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const totalPaidInPeriod = filteredExpenses.reduce(
    (s, e) => s + toNumber(e.amountPaid),
    0
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      const label = getExpenseCategoryLabel(e);
      map.set(label, (map.get(label) ?? 0) + toNumber(e.amount));
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const pieData = categoryBreakdown.map((c) => ({
    name: c.name,
    value: c.amount,
  }));

  const barData = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      const key = new Date(e.date).toLocaleDateString("uz-UZ", {
        day: "2-digit",
        month: "short",
      });
      map.set(key, (map.get(key) ?? 0) + toNumber(e.amount));
    }
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .reverse()
      .slice(-14);
  }, [filteredExpenses]);

  const periodLabel = useMemo(() => {
    if (period === "day") {
      return formatUzDateRangeLabel(rangeFrom, rangeTo);
    }
    if (period === "month") {
      const [y, m] = monthDate.split("-");
      return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("uz-UZ", {
        month: "long",
        year: "numeric",
      });
    }
    if (period === "year") return `${yearDate} yil`;
    return "Barcha davr";
  }, [period, rangeFrom, rangeTo, monthDate, yearDate]);

  const exportPayload = useMemo(
    () => ({
      periodLabel,
      total,
      categoryBreakdown,
      expenses: filteredExpenses.map((e) => ({
        date: e.date,
        category: e.category,
        categoryDetail: e.categoryDetail,
        amount: toNumber(e.amount),
        description: e.description,
        createdBy: e.createdBy.fullName,
        paymentType: e.paymentType?.name,
      })),
    }),
    [filteredExpenses, periodLabel, total, categoryBreakdown]
  );

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => String(y - i));
  }, []);

  const chartAccent = accent === "emerald" ? "emerald" : "amber";

  return (
    <div className="space-y-6">
      {showHeader && (
        <PageHeader
          icon={Wallet}
          title="Xarajatlar"
          description="Klinika chiqimlarini kiritish va kuzatish"
          accent={accent}
        />
      )}

      {debtStats && debtStats.totalDebt > 0 && (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-medium text-rose-900">
                  Xarajat qarzi: {formatMoney(debtStats.totalDebt)}
                </p>
                <p className="text-sm text-rose-700">
                  {debtStats.openExpenseCount} ta ochiq xarajat ·{" "}
                  {debtStats.payeeCount} ta kreditor
                </p>
              </div>
            </div>
            <p className="text-sm text-rose-700">
              Qolgan qarzni to&apos;lash uchun ro&apos;yxatdan xarajatni tanlang
            </p>
          </CardContent>
        </Card>
      )}

      <Card className={accent === "emerald" ? "border-emerald-200" : "border-amber-200"}>
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 pb-4">
          <CardTitle>Xarajat kiritish</CardTitle>
          <p className="text-sm text-muted-foreground">
            Yangi chiqimni shu yerdan kiritasiz — ro&apos;yxat va hisobotlar pastda
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>Kategoriya</Label>
              <Select
                value={category || EXPENSE_CATEGORIES[0]}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Kategoriyani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isOtherCategory && (
              <div className="space-y-2">
                <Label>Boshqa xarajat turi *</Label>
                <Input
                  value={categoryDetail}
                  onChange={(e) => setCategoryDetail(e.target.value)}
                  placeholder="Masalan: Ofis jihozlari, transport..."
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Jami summa (UZS) *</Label>
              <Input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Masalan: 10000000"
              />
            </div>

            <div className="space-y-2">
              <Label>Hozir to&apos;langan summa (UZS)</Label>
              <Input
                type="number"
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                placeholder={amount || "To'liq to'lov"}
              />
            </div>

            {(willHaveDebt || payeeName) && (
              <div className="space-y-2">
                <Label>Kimga qarz? *</Label>
                <Input
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="Masalan: Kurier, yetkazib beruvchi..."
                  required={willHaveDebt}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Xarajat sanasi</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-2 lg:col-span-2 xl:col-span-3">
              <Label>Izoh</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-2 lg:col-span-2 xl:col-span-3">
              <Label>To&apos;lov turi *</Label>
              <p className="text-xs text-muted-foreground">
                Xarajat qaysi hisobdan to&apos;langanini tanlang (naqt, terminal, Click va h.k.)
              </p>
              <PaymentMethodPicker
                types={paymentTypes}
                value={paymentTypeId}
                onChange={setPaymentTypeId}
              />
            </div>

            {willHaveDebt && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 lg:col-span-2 xl:col-span-3">
                <p className="font-medium">Qisman to&apos;lov</p>
                <p>
                  Jami: {formatMoney(totalAmount)} · Hozir: {formatMoney(paidNow)} ·
                  Qolgan qarz: {formatMoney(remainingAfterCreate)}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 lg:col-span-2 xl:col-span-3">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={loading}>
                Saqlash
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <Label>Davr</Label>
            <Select
              value={period}
              onValueChange={(v) => {
                const next = v as PeriodFilter;
                setPeriod(next);
                load({ period: next });
              }}
            >
              <SelectTrigger className="w-36 bg-white">
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
          {period === "month" && (
            <div className="space-y-2">
              <Label>Oy</Label>
              <Input
                type="month"
                value={monthDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setMonthDate(next);
                  load({ period: "month", month: next });
                }}
                className="bg-white"
              />
            </div>
          )}
          {period === "year" && (
            <div className="space-y-2">
              <Label>Yil</Label>
              <Select
                value={yearDate}
                onValueChange={(next) => {
                  setYearDate(next);
                  load({ period: "year", year: next });
                }}
              >
                <SelectTrigger className="w-28 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExpensesExcel(exportPayload, getClinicName())}
            disabled={filteredExpenses.length === 0}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExpensesPdf(exportPayload, getClinicName())}
            disabled={filteredExpenses.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {period === "day" && (
        <div className="max-w-sm">
          <ReportDayCalendar
            mode="range"
            selected={rangeFrom}
            rangeTo={rangeTo}
            onRangeChange={(from, to) => {
              setRangeFrom(from);
              setRangeTo(to);
            }}
            title="Kun oralig'i"
            hint="Birinchi va oxirgi kuni tanlang — oralig'idagi xarajatlar ko'rsatiladi."
            activityDotClassName={accent === "emerald" ? "bg-emerald-500" : "bg-amber-500"}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Jami chiqim"
          value={formatMoney(total)}
          icon={Wallet}
          variant={chartAccent}
        />
        <StatCard
          label="To'langan"
          value={formatMoney(totalPaidInPeriod)}
          icon={Wallet}
          variant="emerald"
          delay={60}
        />
        <StatCard
          label="Xarajatlar soni"
          value={String(filteredExpenses.length)}
          icon={Wallet}
          variant="violet"
          delay={120}
        />
        {debtStats && debtStats.totalDebt > 0 && (
          <StatCard
            label="Ochiq qarz"
            value={formatMoney(debtStats.totalDebt)}
            icon={AlertTriangle}
            variant="rose"
            delay={180}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={accent === "emerald" ? "border-emerald-100" : "border-amber-100"}>
          <CardHeader>
            <CardTitle className="text-base">Kategoriyalar bo&apos;yicha (diagramma)</CardTitle>
            <p className="text-sm text-muted-foreground">{periodLabel}</p>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => {
                      const label = name ?? "";
                      const pct = percent ?? 0;
                      return `${label.length > 12 ? `${label.slice(0, 12)}…` : label} ${(pct * 100).toFixed(0)}%`;
                    }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={chartMoneyFormatter} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className={accent === "emerald" ? "border-emerald-100" : "border-amber-100"}>
          <CardHeader>
            <CardTitle className="text-base">Kunlik chiqim dinamikasi</CardTitle>
            <p className="text-sm text-muted-foreground">
              {period === "day" ? periodLabel : "So'nggi kunlar"}
            </p>
          </CardHeader>
          <CardContent className="h-72">
            {barData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={chartMoneyFormatter} />
                  <Bar
                    dataKey="amount"
                    fill={accent === "emerald" ? "#10b981" : "#f59e0b"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategoriyalar</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kategoriyani bosing — faqat shu turdagi xarajatlar ko&apos;rinadi
            {filterCategory && (
              <>
                {" "}
                · Tanlangan:{" "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => setFilterCategory(null)}
                >
                  {filterCategory} (tozalash)
                </button>
              </>
            )}
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={filterCategory === null ? "default" : "outline"}
              onClick={() => setFilterCategory(null)}
            >
              Barchasi ({expenses.length})
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categorySummary.map((cat) => (
              <button
                key={cat.key}
                type="button"
                disabled={cat.count === 0}
                onClick={() =>
                  setFilterCategory(filterCategory === cat.key ? null : cat.key)
                }
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed",
                  filterCategory === cat.key
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : cat.count > 0
                      ? "hover:border-slate-300 hover:bg-slate-50"
                      : "opacity-40"
                )}
              >
                <p className="text-sm font-medium leading-snug">{cat.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{cat.count} ta</p>
                <p className="mt-1 font-semibold">{formatMoney(cat.amount)}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Xarajatlar ro&apos;yxati</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filterCategory ? `${filterCategory} · ` : ""}
              {periodLabel} · Jami: {formatMoney(total)}
            </p>
          </CardHeader>
          <CardContent>
            {listLoading && (
              <p className="mb-3 text-sm text-muted-foreground">Yuklanmoqda...</p>
            )}
            <ul className="max-h-[500px] space-y-2 overflow-y-auto">
              {filteredExpenses.length === 0 ? (
                <li className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  {filterCategory
                    ? `"${filterCategory}" kategoriyasida xarajat yo'q`
                    : period === "day"
                      ? `${periodLabel} uchun xarajat yo'q`
                      : "Tanlangan davrda xarajat yo'q"}
                </li>
              ) : (
                filteredExpenses.map((e) => {
                  const balance = toNumber(e.balanceDue);
                  const paid = toNumber(e.amountPaid);
                  const isPartial = e.status === "PARTIALLY_PAID";
                  const isPaying = payingExpense?.id === e.id;

                  return (
                    <li key={e.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2 font-medium">
                        <div className="space-y-1">
                          <span>{getExpenseCategoryLabel(e)}</span>
                          {e.payeeName && (
                            <p className="text-xs font-normal text-muted-foreground">
                              Kreditor: {e.payeeName}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span>{formatMoney(toNumber(e.amount))}</span>
                          {isPartial && (
                            <Badge variant="outline" className="ml-2 border-rose-200 text-rose-700">
                              Qarz: {formatMoney(balance)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-muted-foreground">
                        {new Date(e.date).toLocaleDateString("uz-UZ")} · {e.createdBy.fullName}
                        {e.paymentType ? ` · ${e.paymentType.name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        To&apos;langan: {formatMoney(paid)}
                        {isPartial && ` · Qoldiq: ${formatMoney(balance)}`}
                      </p>
                      {e.description && <p>{e.description}</p>}
                      {isPartial && !isPaying && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            setPayingExpense(e);
                            setDebtPayAmount(String(balance));
                            setDebtPayError("");
                          }}
                        >
                          Qarzni to&apos;lash ({formatMoney(balance)})
                        </Button>
                      )}
                      {isPaying && (
                        <div className="mt-3 space-y-3 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                          <p className="font-medium text-rose-900">
                            Qarz to&apos;lovi — {e.payeeName || getExpenseCategoryLabel(e)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Qoldiq: {formatMoney(debtBalance)}
                          </p>
                          <PaymentMethodPicker
                            types={paymentTypes}
                            value={debtPaymentTypeId}
                            onChange={setDebtPaymentTypeId}
                          />
                          <div className="space-y-2">
                            <Label>To&apos;lov summasi</Label>
                            <Input
                              type="number"
                              value={debtPayAmount}
                              onChange={(ev) => setDebtPayAmount(ev.target.value)}
                            />
                            {isDebtCash && debtChange > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Qaytim: {formatMoney(debtChange)}
                              </p>
                            )}
                          </div>
                          {debtPayError && (
                            <p className="text-sm text-destructive">{debtPayError}</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={debtPayLoading}
                              onClick={submitDebtPayment}
                            >
                              To&apos;lash
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setPayingExpense(null)}
                            >
                              Bekor
                            </Button>
                          </div>
                        </div>
                      )}
                      {e.payments && e.payments.length > 0 && (
                        <ul className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
                          {e.payments.map((p) => (
                            <li key={p.id}>
                              {new Date(p.createdAt).toLocaleString("uz-UZ")} ·{" "}
                              {formatMoney(toNumber(p.amount))} · {p.paymentType.name} ·{" "}
                              {p.createdBy.fullName}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </CardContent>
      </Card>
    </div>
  );
}
