"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { StatCard } from "@/components/kassa/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Badge } from "@/components/kassa/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/kassa/ui/select";
import { PaymentMethodPicker } from "@/components/kassa/payment/payment-method-picker";
import {
  EXPENSE_CATEGORIES,
  OTHER_EXPENSE_CATEGORY,
  getExpenseCategoryLabel,
} from "@/lib/kassa/expenses";
import { getLocalDateString } from "@/lib/kassa/date";
import {
  KASSA_PAYMENT_COMPLETED,
  notifyPaymentCompleted,
} from "@/lib/kassa/kassa-events";
import { formatMoney, toNumber } from "@/lib/kassa/utils";

type PaymentType = {
  id: string;
  name: string;
  platform: string;
  requiresGateway?: boolean;
  gatewayConfigured?: boolean;
};

type ExpenseDebtItem = {
  id: string;
  category: string;
  categoryDetail?: string | null;
  amount: { toString(): string } | number;
  amountPaid: { toString(): string } | number;
  balanceDue: { toString(): string } | number;
  payeeName?: string | null;
  date: string;
  description?: string | null;
};

type ExpenseDebtGroup = {
  payeeName: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  expenses?: ExpenseDebtItem[];
};

type ExpenseDebtStats = {
  openExpenseCount: number;
  payeeCount: number;
  totalDebt: number;
};

export function ExpenseDebtsView({ isActive = true }: { isActive?: boolean }) {
  const [stats, setStats] = useState<ExpenseDebtStats | null>(null);
  const [debts, setDebts] = useState<ExpenseDebtGroup[]>([]);
  const [categories, setCategories] = useState<string[]>([...EXPENSE_CATEGORIES]);
  const [loading, setLoading] = useState(true);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);

  // Yangi qarz formasi
  const [payeeName, setPayeeName] = useState("");
  const [amount, setAmount] = useState("");
  const [amountPaidNow, setAmountPaidNow] = useState("0");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [categoryDetail, setCategoryDetail] = useState("");
  const [date, setDate] = useState(getLocalDateString);
  const [description, setDescription] = useState("");
  const [createPaymentTypeId, setCreatePaymentTypeId] = useState("");
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // Qarz to'lash
  const [expandedPayee, setExpandedPayee] = useState<string | null>(null);
  const [payingExpense, setPayingExpense] = useState<ExpenseDebtItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [paymentTypeId, setPaymentTypeId] = useState("");
  const [payError, setPayError] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  const isOtherCategory = category === OTHER_EXPENSE_CATEGORY;
  const totalAmount = parseFloat(amount || "0");
  const paidNow = parseFloat(amountPaidNow || "0");
  const remainingOnCreate =
    totalAmount > 0 && paidNow < totalAmount ? totalAmount - Math.max(0, paidNow) : 0;

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/kassa/expense-debts", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats ?? null);
        setDebts(Array.isArray(data.debts) ? data.debts : []);
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch(() => {
        setStats(null);
        setDebts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/kassa/payment-types")
      .then((r) => r.json())
      .then((pt) => {
        if (!Array.isArray(pt)) return;
        setPaymentTypes(pt);
        const cash =
          pt.find((p: PaymentType) => p.platform === "CASH") || pt[0];
        if (cash) {
          setPaymentTypeId((prev) => prev || cash.id);
          setCreatePaymentTypeId((prev) => prev || cash.id);
        }
      })
      .catch(() => setPaymentTypes([]));
  }, []);

  useEffect(() => {
    if (!isActive) return;
    load();
    window.addEventListener("focus", load);
    window.addEventListener(KASSA_PAYMENT_COMPLETED, load);
    return () => {
      window.removeEventListener("focus", load);
      window.removeEventListener(KASSA_PAYMENT_COMPLETED, load);
    };
  }, [isActive, load]);

  const selectedPaymentType = paymentTypes.find((p) => p.id === paymentTypeId);
  const isCash = selectedPaymentType?.platform === "CASH";
  const debtBalance = payingExpense ? toNumber(payingExpense.balanceDue) : 0;
  const paidInput = parseFloat(payAmount || "0");
  const change = isCash ? Math.max(0, paidInput - debtBalance) : 0;

  async function submitCreateDebt(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");

    if (!payeeName.trim()) {
      setCreateError("Kimga qarz ekanligini kiriting");
      return;
    }
    if (totalAmount <= 0) {
      setCreateError("Qarz summasi 0 dan katta bo'lishi kerak");
      return;
    }
    if (paidNow < 0) {
      setCreateError("To'langan summa manfiy bo'lishi mumkin emas");
      return;
    }
    if (paidNow >= totalAmount) {
      setCreateError(
        "To'liq to'lov uchun «Xarajatlar» bo'limidan foydalaning. Bu yerda qarz qoldiq bo'lishi shart.",
      );
      return;
    }
    if (isOtherCategory && !categoryDetail.trim()) {
      setCreateError("Boshqa xarajat turini kiriting");
      return;
    }
    if (paidNow > 0 && !createPaymentTypeId) {
      setCreateError("Hozir to'lanadigan summa uchun to'lov turini tanlang");
      return;
    }

    setCreateLoading(true);
    try {
      const res = await fetch("/api/kassa/expense-debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payeeName: payeeName.trim(),
          amount: totalAmount,
          amountPaid: paidNow > 0 ? paidNow : 0,
          category,
          categoryDetail: isOtherCategory ? categoryDetail.trim() : undefined,
          description: description.trim() || undefined,
          date,
          paymentTypeId: paidNow > 0 ? createPaymentTypeId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Saqlashda xatolik");
        return;
      }

      setPayeeName("");
      setAmount("");
      setAmountPaidNow("0");
      setCategoryDetail("");
      setDescription("");
      if (paidNow > 0) notifyPaymentCompleted();
      load();
    } finally {
      setCreateLoading(false);
    }
  }

  function openPayForm(expense: ExpenseDebtItem, groupPayee: string) {
    setExpandedPayee(groupPayee);
    setPayingExpense(expense);
    setPayAmount(String(toNumber(expense.balanceDue)));
    setPayError("");
  }

  function closePayForm() {
    setPayingExpense(null);
    setPayAmount("");
    setPayError("");
  }

  async function submitDebtPayment() {
    if (!payingExpense) return;
    setPayError("");

    if (!paymentTypeId) {
      setPayError("To'lov turini tanlang");
      return;
    }
    if (paidInput <= 0) {
      setPayError("To'lov summasini kiriting");
      return;
    }
    if (!isCash && paidInput > debtBalance) {
      setPayError(`Maksimal to'lov: ${formatMoney(debtBalance)}`);
      return;
    }

    setPayLoading(true);
    try {
      const res = await fetch(`/api/kassa/expenses/${payingExpense.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentTypeId,
          amountPaid: paidInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error || "To'lov saqlanmadi");
        return;
      }
      closePayForm();
      notifyPaymentCompleted();
      load();
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={TrendingDown}
        title="Xarajat qarzi"
        description="Klinika tashqi qarzlarini kiriting va to'lang — to'lov Chiqim (xarajat) hisobotiga yoziladi"
        accent="amber"
      />

      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader>
          <CardTitle className="text-base text-amber-900">
            Yangi qarz kiritish
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submitCreateDebt}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Kimga qarz? *</Label>
              <Input
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Masalan: Yetkazib beruvchi, ijara..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Qarz summasi (UZS) *</Label>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Masalan: 5000000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Hozir to&apos;lanadi (ixtiyoriy)</Label>
              <Input
                type="number"
                min={0}
                value={amountPaidNow}
                onChange={(e) => setAmountPaidNow(e.target.value)}
                placeholder="0 — keyinroq to'lash"
              />
            </div>

            <div className="space-y-2">
              <Label>Kategoriya *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Kategoriya" />
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
                <Label>Boshqa turi *</Label>
                <Input
                  value={categoryDetail}
                  onChange={(e) => setCategoryDetail(e.target.value)}
                  placeholder="Masalan: Transport..."
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Sana</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label>Izoh</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Qarz haqida qisqa izoh"
              />
            </div>

            {paidNow > 0 && (
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>Hozirgi to&apos;lov turi *</Label>
                <PaymentMethodPicker
                  types={paymentTypes}
                  value={createPaymentTypeId}
                  onChange={setCreatePaymentTypeId}
                />
              </div>
            )}

            {remainingOnCreate > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 sm:col-span-2 lg:col-span-3">
                <p className="font-medium">Qarz qoldig&apos;i</p>
                <p>
                  Jami: {formatMoney(totalAmount)}
                  {paidNow > 0 ? ` · Hozir: ${formatMoney(paidNow)}` : ""} · Qoladi:{" "}
                  {formatMoney(remainingOnCreate)}
                </p>
                <p className="mt-1 text-xs text-orange-800/80">
                  Faqat to&apos;langan summa Moliyaviy hisobotlar → Chiqim (xarajat) ga
                  tushadi.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
              <Button type="submit" disabled={createLoading}>
                {createLoading ? "Saqlanmoqda…" : "Qarzni kiritish"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && !stats ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Ochiq xarajatlar"
              value={String(stats?.openExpenseCount ?? 0)}
              icon={TrendingDown}
              variant="amber"
            />
            <StatCard
              label="Kreditorlar"
              value={String(stats?.payeeCount ?? 0)}
              icon={TrendingDown}
              variant="amber"
              delay={80}
            />
            <StatCard
              label="Jami qarz"
              value={formatMoney(stats?.totalDebt ?? 0)}
              icon={TrendingDown}
              variant="rose"
              delay={160}
            />
          </div>

          <Card className="border-orange-200 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-orange-800">
                <TrendingDown className="h-5 w-5" />
                Ochiq qarzlar — to&apos;lash
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {debts.length === 0 ? (
                <p className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                  Hozircha ochiq qarz yo&apos;q. Yuqoridan yangi qarz kiriting.
                </p>
              ) : (
                debts.map((group) => {
                  const expenses = group.expenses ?? [];
                  const isExpanded = expandedPayee === group.payeeName;

                  return (
                    <div
                      key={group.payeeName}
                      className="overflow-hidden rounded-xl border border-orange-100 bg-white"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {group.payeeName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Jami: {formatMoney(group.totalAmount)} · To&apos;langan:{" "}
                            {formatMoney(group.paidAmount)} ·{" "}
                            <span className="font-medium text-orange-700">
                              Qoldiq: {formatMoney(group.balanceDue)}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-orange-200 text-orange-700"
                          >
                            {expenses.length || "—"} ta
                          </Badge>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedPayee(null);
                                closePayForm();
                                return;
                              }
                              setExpandedPayee(group.payeeName);
                              closePayForm();
                              if (expenses.length === 1) {
                                openPayForm(expenses[0], group.payeeName);
                              }
                            }}
                          >
                            {isExpanded ? "Yopish" : "Qarzni to'lash"}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-3 border-t bg-orange-50/40 p-4">
                          {expenses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Xarajatlar topilmadi
                            </p>
                          ) : (
                            expenses.map((expense) => {
                              const balance = toNumber(expense.balanceDue);
                              const paid = toNumber(expense.amountPaid);
                              const isPaying = payingExpense?.id === expense.id;

                              return (
                                <div
                                  key={expense.id}
                                  className="rounded-lg border bg-white p-3 text-sm"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium">
                                        {getExpenseCategoryLabel(expense)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(expense.date).toLocaleDateString(
                                          "uz-UZ",
                                        )}
                                        {expense.description
                                          ? ` · ${expense.description}`
                                          : ""}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        To&apos;langan: {formatMoney(paid)} · Qoldiq:{" "}
                                        <span className="font-medium text-orange-700">
                                          {formatMoney(balance)}
                                        </span>
                                      </p>
                                    </div>
                                    {!isPaying && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          openPayForm(expense, group.payeeName)
                                        }
                                      >
                                        To&apos;lash ({formatMoney(balance)})
                                      </Button>
                                    )}
                                  </div>

                                  {isPaying && (
                                    <div className="mt-3 space-y-3 rounded-lg border border-rose-100 bg-rose-50/40 p-3">
                                      <p className="font-medium text-rose-900">
                                        Qarz to&apos;lash — {group.payeeName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Qoldiq: {formatMoney(debtBalance)}. To&apos;lov
                                        Chiqim (xarajat) hisobotiga yoziladi.
                                      </p>
                                      <PaymentMethodPicker
                                        types={paymentTypes}
                                        value={paymentTypeId}
                                        onChange={setPaymentTypeId}
                                      />
                                      <div className="space-y-2">
                                        <Label>To&apos;lov summasi</Label>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={payAmount}
                                          onChange={(ev) =>
                                            setPayAmount(ev.target.value)
                                          }
                                        />
                                        {isCash && change > 0 && (
                                          <p className="text-xs text-muted-foreground">
                                            Qaytim: {formatMoney(change)}
                                          </p>
                                        )}
                                      </div>
                                      {payError && (
                                        <p className="text-sm text-destructive">
                                          {payError}
                                        </p>
                                      )}
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={payLoading}
                                          onClick={submitDebtPayment}
                                        >
                                          {payLoading
                                            ? "Saqlanmoqda…"
                                            : "To'lash"}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={closePayForm}
                                        >
                                          Bekor
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
