"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PencilLine, Search, TrendingDown, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { Button } from "@/components/kassa/ui/button";
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
import { ReportDayCalendar } from "@/components/kassa/reports/report-day-calendar";
import {
  EXPENSE_CATEGORIES,
  OTHER_EXPENSE_CATEGORY,
  getExpenseCategoryLabel,
} from "@/lib/kassa/expenses";
import { formatUzDateRangeLabel, getLocalDateString } from "@/lib/kassa/date";
import { formatDate, formatMoney, parseApiJson, toNumber } from "@/lib/kassa/utils";

type IncomePayment = {
  id: string;
  amount: { toString(): string };
  createdAt: string;
  paymentType: { name: string };
  cashier: { fullName: string };
  invoice: {
    id: string;
    invoiceNumber: number;
    total: { toString(): string };
    amountPaid: { toString(): string };
    balanceDue: { toString(): string };
    patient: { fullName: string };
  };
};

type IncomeInvoice = {
  id: string;
  invoiceNumber: number;
  total: { toString(): string };
  amountPaid: { toString(): string };
  balanceDue: { toString(): string };
  createdAt: string;
  patient: { fullName: string };
  cashier: { fullName: string };
  paymentType: { name: string };
};

type ExpenseRow = {
  id: string;
  category: string;
  categoryDetail?: string | null;
  amount: { toString(): string };
  amountPaid: { toString(): string };
  balanceDue: { toString(): string };
  payeeName?: string | null;
  description?: string | null;
  date: string;
  createdBy: { fullName: string };
  payments?: Array<{
    id: string;
    amount: { toString(): string };
    createdBy: { fullName: string };
    paymentType: { name: string };
  }>;
};

type Tab = "income" | "expense";

function expenseDateKey(date: string) {
  return date.slice(0, 10);
}

export function FinancialCorrectionsView({ isActive = true }: { isActive?: boolean }) {
  const [tab, setTab] = useState<Tab>("income");
  const [rangeFrom, setRangeFrom] = useState(getLocalDateString());
  const [rangeTo, setRangeTo] = useState(getLocalDateString());
  const [calendarMonth, setCalendarMonth] = useState(() =>
    getLocalDateString().slice(0, 7)
  );
  const [activityDates, setActivityDates] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [incomePayments, setIncomePayments] = useState<IncomePayment[]>([]);
  const [incomeInvoices, setIncomeInvoices] = useState<IncomeInvoice[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  const [editingIncomePayment, setEditingIncomePayment] = useState<IncomePayment | null>(null);
  const [editingIncomeInvoice, setEditingIncomeInvoice] = useState<IncomeInvoice | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const [editingExpensePaymentId, setEditingExpensePaymentId] = useState<string | null>(null);

  const [amountInput, setAmountInput] = useState("");
  const [totalInput, setTotalInput] = useState("");
  const [paidInput, setPaidInput] = useState("");
  const [editCategory, setEditCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [editCategoryDetail, setEditCategoryDetail] = useState("");
  const [editDate, setEditDate] = useState(getLocalDateString());
  const [editDescription, setEditDescription] = useState("");
  const [editPayeeName, setEditPayeeName] = useState("");
  const [saving, setSaving] = useState(false);

  const isOtherCategory = editCategory === OTHER_EXPENSE_CATEGORY;
  const editTotal = parseFloat(totalInput || "0");
  const editPaid = parseFloat(paidInput || "0");
  const editWillHaveDebt =
    editTotal > 0 && editPaid > 0 && editPaid < editTotal;
  const editMultiplePayments =
    (editingExpense?.payments?.length ?? 0) > 1;

  const categoryOptions = useMemo(() => {
    if (
      editCategory &&
      !EXPENSE_CATEGORIES.includes(editCategory as (typeof EXPENSE_CATEGORIES)[number])
    ) {
      return [editCategory, ...EXPENSE_CATEGORIES];
    }
    return [...EXPENSE_CATEGORIES];
  }, [editCategory]);

  const loadIncome = useCallback(() => {
    const params = new URLSearchParams({ from: rangeFrom, to: rangeTo });
    if (search.trim()) params.set("search", search.trim());

    return fetch(`/api/kassa/admin/corrections/income?${params}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await parseApiJson<{ error?: string; payments?: IncomePayment[]; invoicesWithoutPayments?: IncomeInvoice[] }>(r);
        if (!r.ok) throw new Error(data.error || "Kirimlar yuklanmadi");
        setIncomePayments(data.payments || []);
        setIncomeInvoices(data.invoicesWithoutPayments || []);
      });
  }, [rangeFrom, rangeTo, search]);

  const loadExpenses = useCallback(() => {
    const params = new URLSearchParams({ from: rangeFrom, to: rangeTo });
    return fetch(`/api/kassa/expenses?${params}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await parseApiJson<{ error?: string; expenses?: ExpenseRow[] }>(r);
        if (!r.ok) throw new Error(data.error || "Xarajatlar yuklanmadi");
        setExpenses(data.expenses || []);
      });
  }, [rangeFrom, rangeTo]);

  const load = useCallback(() => {
    if (!isActive) return;
    setLoading(true);
    setError("");
    const task = tab === "income" ? loadIncome() : loadExpenses();
    task.catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [isActive, tab, loadIncome, loadExpenses]);

  useEffect(() => {
    load();
  }, [load]);

  const handleViewMonthChange = useCallback((monthKey: string) => {
    setCalendarMonth(monthKey);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    if (tab === "expense") {
      fetch(`/api/kassa/expenses?month=${calendarMonth}`, { cache: "no-store" })
        .then(async (r) => {
          const data = await parseApiJson<{ expenses?: ExpenseRow[] }>(r);
          if (!r.ok) {
            setActivityDates(new Set());
            return;
          }
          const dates = new Set<string>(
            (data.expenses || []).map((e) => expenseDateKey(e.date))
          );
          setActivityDates(dates);
        })
        .catch(() => setActivityDates(new Set()));
      return;
    }

    fetch(`/api/kassa/admin/corrections/income?month=${calendarMonth}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await parseApiJson<{
          payments?: Array<{ createdAt: string }>;
          invoicesWithoutPayments?: Array<{ createdAt: string }>;
        }>(r);
        if (!r.ok) {
          setActivityDates(new Set());
          return;
        }
        const dates = new Set<string>();
        for (const payment of data.payments || []) {
          dates.add(getLocalDateString(new Date(payment.createdAt)));
        }
        for (const invoice of data.invoicesWithoutPayments || []) {
          dates.add(getLocalDateString(new Date(invoice.createdAt)));
        }
        setActivityDates(dates);
      })
      .catch(() => setActivityDates(new Set()));
  }, [isActive, tab, calendarMonth]);

  const selectedPeriodLabel = useMemo(
    () => formatUzDateRangeLabel(rangeFrom, rangeTo),
    [rangeFrom, rangeTo]
  );

  const calendarConfig = useMemo(
    () =>
      tab === "expense"
        ? {
            hint: "Birinchi va oxirgi kuni tanlang — oralig'idagi xarajatlarni tuzatishingiz mumkin.",
            activityHint: "— xarajat bor kunlar",
            activityDotClassName: "bg-orange-500",
          }
        : {
            hint: "Birinchi va oxirgi kuni tanlang — oralig'idagi kirimlarni tuzatishingiz mumkin.",
            activityHint: "— kirim bor kunlar",
            activityDotClassName: "bg-emerald-500",
          },
    [tab]
  );

  function resetEditor() {
    setEditingIncomePayment(null);
    setEditingIncomeInvoice(null);
    setEditingExpense(null);
    setEditingExpensePaymentId(null);
    setAmountInput("");
    setTotalInput("");
    setPaidInput("");
    setEditCategory(EXPENSE_CATEGORIES[0]);
    setEditCategoryDetail("");
    setEditDate(getLocalDateString());
    setEditDescription("");
    setEditPayeeName("");
    setError("");
    setSuccess("");
  }

  function openExpenseEditor(expense: ExpenseRow) {
    setEditingExpense(expense);
    setEditingExpensePaymentId(null);
    setEditingIncomePayment(null);
    setEditingIncomeInvoice(null);
    setEditCategory(expense.category);
    setEditCategoryDetail(expense.categoryDetail || "");
    setTotalInput(String(toNumber(expense.amount)));
    setPaidInput(String(toNumber(expense.amountPaid)));
    setEditDate(expenseDateKey(expense.date));
    setEditDescription(expense.description || "");
    setEditPayeeName(expense.payeeName || "");
    setError("");
    setSuccess("");
  }

  async function saveIncomePayment() {
    if (!editingIncomePayment) return;
    const amount = parseFloat(amountInput);
    if (Number.isNaN(amount) || amount < 0) {
      setError("To'g'ri summa kiriting");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/kassa/admin/corrections/income", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          paymentId: editingIncomePayment.id,
          amount,
        }),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Saqlanmadi");
      setSuccess("Kirim to'lovi yangilandi");
      resetEditor();
      await loadIncome();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  }

  async function saveIncomeInvoice() {
    if (!editingIncomeInvoice) return;
    const total = totalInput ? parseFloat(totalInput) : undefined;
    const amountPaid = paidInput ? parseFloat(paidInput) : undefined;
    if (
      (total != null && (Number.isNaN(total) || total <= 0)) ||
      (amountPaid != null && (Number.isNaN(amountPaid) || amountPaid < 0))
    ) {
      setError("To'g'ri summalar kiriting");
      return;
    }
    if (total == null && amountPaid == null) {
      setError("Kamida bitta summani kiriting");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/kassa/admin/corrections/income", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "invoice",
          invoiceId: editingIncomeInvoice.id,
          total,
          amountPaid,
        }),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Saqlanmadi");
      setSuccess("Chek summasi yangilandi");
      resetEditor();
      await loadIncome();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  }

  async function saveExpense() {
    if (!editingExpense) return;

    if (isOtherCategory && !editCategoryDetail.trim()) {
      setError("Boshqa xarajat turini kiriting");
      return;
    }
    if (Number.isNaN(editTotal) || editTotal <= 0) {
      setError("Jami summa 0 dan katta bo'lishi kerak");
      return;
    }
    if (Number.isNaN(editPaid) || editPaid < 0) {
      setError("To'langan summa noto'g'ri");
      return;
    }
    if (editPaid > editTotal) {
      setError("To'langan summa jami xarajatdan oshmasligi kerak");
      return;
    }
    if (editWillHaveDebt && !editPayeeName.trim()) {
      setError("Qisman to'lov uchun kimga qarz ekanligini kiriting");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/kassa/admin/corrections/expense", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          expenseId: editingExpense.id,
          category: editCategory,
          categoryDetail: isOtherCategory ? editCategoryDetail.trim() : null,
          amount: editTotal,
          amountPaid: editPaid,
          date: editDate,
          description: editDescription.trim() || null,
          payeeName: editWillHaveDebt ? editPayeeName.trim() : null,
        }),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Saqlanmadi");
      setSuccess("Xarajat yangilandi");
      resetEditor();
      await loadExpenses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  }

  async function saveExpensePayment() {
    if (!editingExpense || !editingExpensePaymentId) return;
    const amount = parseFloat(amountInput);
    if (Number.isNaN(amount) || amount < 0) {
      setError("To'g'ri summa kiriting");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/kassa/admin/corrections/expense", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payment",
          paymentId: editingExpensePaymentId,
          amount,
        }),
      });
      const data = await parseApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Saqlanmadi");
      setSuccess("Xarajat to'lovi yangilandi");
      resetEditor();
      await loadExpenses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={PencilLine}
        title="Summa tuzatish"
        description="Kassir adashib kiritgan kirim yoki chiqim summalarini administrator to'g'rilaydi"
        accent="violet"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tab === "income" ? "default" : "outline"}
          onClick={() => {
            setTab("income");
            resetEditor();
          }}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          Kirim
        </Button>
        <Button
          type="button"
          variant={tab === "expense" ? "default" : "outline"}
          onClick={() => {
            setTab("expense");
            resetEditor();
          }}
        >
          <TrendingDown className="mr-2 h-4 w-4" />
          Chiqim
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <div className="space-y-4">
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
            hint={calendarConfig.hint}
            activityHint={calendarConfig.activityHint}
            activityDotClassName={calendarConfig.activityDotClassName}
          />
          {tab === "income" && (
            <Card>
              <CardContent className="space-y-2 pt-4">
                <Label>Bemor qidirish</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ism familiya"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-violet-900">{selectedPeriodLabel}</p>

      {tab === "income" ? (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kirim to&apos;lovlari</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
              ) : incomePayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tanlangan davrda kirim to&apos;lovi yo&apos;q</p>
              ) : (
                incomePayments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border p-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {payment.invoice.patient.fullName}
                        </p>
                        <p className="text-muted-foreground">
                          Chek #{payment.invoice.invoiceNumber} · {formatDate(payment.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.cashier.fullName} · {payment.paymentType.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-700">
                          {formatMoney(payment.amount)}
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            setEditingIncomePayment(payment);
                            setEditingIncomeInvoice(null);
                            setAmountInput(String(toNumber(payment.amount)));
                            setError("");
                            setSuccess("");
                          }}
                        >
                          Tahrirlash
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">To&apos;lovsiz cheklar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {incomeInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">To&apos;lovsiz chek yo&apos;q</p>
                ) : (
                  incomeInvoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border p-4 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{invoice.patient.fullName}</p>
                          <p className="text-muted-foreground">
                            Chek #{invoice.invoiceNumber} · Jami {formatMoney(invoice.total)}
                          </p>
                          <Badge variant="outline" className="mt-1 border-rose-200 text-rose-700">
                            Qarz: {formatMoney(invoice.balanceDue)}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingIncomeInvoice(invoice);
                            setEditingIncomePayment(null);
                            setTotalInput(String(toNumber(invoice.total)));
                            setPaidInput(String(toNumber(invoice.amountPaid)));
                            setError("");
                            setSuccess("");
                          }}
                        >
                          Tahrirlash
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {(editingIncomePayment || editingIncomeInvoice) && (
              <Card className="border-violet-200 bg-violet-50/30">
                <CardHeader>
                  <CardTitle className="text-base text-violet-900">
                    {editingIncomePayment ? "Kirim to'lovini tuzatish" : "Chek summasini tuzatish"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editingIncomePayment ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {editingIncomePayment.invoice.patient.fullName} · Chek #
                        {editingIncomePayment.invoice.invoiceNumber}
                      </p>
                      <div className="space-y-2">
                        <Label>To&apos;lov summasi</Label>
                        <Input
                          type="number"
                          min={0}
                          value={amountInput}
                          onChange={(e) => setAmountInput(e.target.value)}
                        />
                      </div>
                      <Button type="button" onClick={saveIncomePayment} disabled={saving}>
                        {saving ? "Saqlanmoqda..." : "Saqlash"}
                      </Button>
                    </>
                  ) : editingIncomeInvoice ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        {editingIncomeInvoice.patient.fullName} · Chek #
                        {editingIncomeInvoice.invoiceNumber}
                      </p>
                      <div className="space-y-2">
                        <Label>Jami summa</Label>
                        <Input
                          type="number"
                          min={0}
                          value={totalInput}
                          onChange={(e) => setTotalInput(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>To&apos;langan</Label>
                        <Input
                          type="number"
                          min={0}
                          value={paidInput}
                          onChange={(e) => setPaidInput(e.target.value)}
                        />
                      </div>
                      <Button type="button" onClick={saveIncomeInvoice} disabled={saving}>
                        {saving ? "Saqlanmoqda..." : "Saqlash"}
                      </Button>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Xarajatlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
              ) : expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tanlangan davrda xarajat yo&apos;q</p>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="rounded-xl border p-4 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{getExpenseCategoryLabel(expense)}</p>
                        <p className="text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString("uz-UZ")} ·{" "}
                          {expense.createdBy.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Jami {formatMoney(expense.amount)} · To&apos;langan{" "}
                          {formatMoney(expense.amountPaid)}
                        </p>
                        {expense.description && (
                          <p className="mt-1 text-xs text-muted-foreground">{expense.description}</p>
                        )}
                        {expense.payments?.map((payment) => (
                          <div
                            key={payment.id}
                            className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                          >
                            <span className="text-xs text-muted-foreground">
                              {payment.paymentType.name} · {payment.createdBy.fullName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatMoney(payment.amount)}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingExpense(expense);
                                  setEditingExpensePaymentId(payment.id);
                                  setEditingIncomePayment(null);
                                  setEditingIncomeInvoice(null);
                                  setAmountInput(String(toNumber(payment.amount)));
                                  setError("");
                                  setSuccess("");
                                }}
                              >
                                Tahrirlash
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => openExpenseEditor(expense)}
                      >
                        Tahrirlash
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {editingExpense && (
            <Card className="border-violet-200 bg-violet-50/30">
              <CardHeader>
                <CardTitle className="text-base text-violet-900">
                  {editingExpensePaymentId
                    ? "Xarajat to'lovini tuzatish"
                    : "Xarajatni tuzatish"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingExpensePaymentId ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {getExpenseCategoryLabel(editingExpense)}
                    </p>
                    <div className="space-y-2">
                      <Label>To&apos;lov summasi</Label>
                      <Input
                        type="number"
                        min={0}
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={saveExpensePayment} disabled={saving}>
                        {saving ? "Saqlanmoqda..." : "Saqlash"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={resetEditor}>
                        Bekor
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Kategoriya</Label>
                      <Select
                        value={editCategory}
                        onValueChange={(value) => {
                          setEditCategory(value);
                          if (value !== OTHER_EXPENSE_CATEGORY) {
                            setEditCategoryDetail("");
                          }
                        }}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((c) => (
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
                          value={editCategoryDetail}
                          onChange={(e) => setEditCategoryDetail(e.target.value)}
                          placeholder="Masalan: Ofis jihozlari"
                        />
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Jami summa (UZS) *</Label>
                        <Input
                          type="number"
                          min={0}
                          value={totalInput}
                          onChange={(e) => setTotalInput(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>To&apos;langan summa (UZS) *</Label>
                        <Input
                          type="number"
                          min={0}
                          value={paidInput}
                          onChange={(e) => setPaidInput(e.target.value)}
                          disabled={editMultiplePayments}
                        />
                        {editMultiplePayments && (
                          <p className="text-xs text-amber-700">
                            Bir nechta to&apos;lov bor — har birini ro&apos;yxatdan alohida
                            tahrirlang
                          </p>
                        )}
                      </div>
                    </div>

                    {(editWillHaveDebt || editPayeeName) && (
                      <div className="space-y-2">
                        <Label>Kimga qarz? {editWillHaveDebt ? "*" : ""}</Label>
                        <Input
                          value={editPayeeName}
                          onChange={(e) => setEditPayeeName(e.target.value)}
                          placeholder="Masalan: Yetkazib beruvchi"
                          required={editWillHaveDebt}
                        />
                      </div>
                    )}

                    {editWillHaveDebt && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        Qolgan qarz: {formatMoney(editTotal - editPaid)}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Xarajat sanasi *</Label>
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Izoh</Label>
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Qo'shimcha ma'lumot"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={saveExpense} disabled={saving}>
                        {saving ? "Saqlanmoqda..." : "Saqlash"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={resetEditor}>
                        Bekor
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
