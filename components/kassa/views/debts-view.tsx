"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  HandCoins,
  Phone,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { StatCard } from "@/components/kassa/ui/stat-card";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Badge } from "@/components/kassa/ui/badge";
import { PaymentMethodPicker } from "@/components/kassa/payment/payment-method-picker";
import { notifyPaymentCompleted, KASSA_PAYMENT_COMPLETED } from "@/lib/kassa/kassa-events";
import { formatPaidByMethodLabel, summarizePaidByMethod } from "@/lib/kassa/debts";
import { formatDate, formatMoney, toNumber } from "@/lib/kassa/utils";

type PaymentType = {
  id: string;
  name: string;
  platform: string;
  requiresGateway?: boolean;
  gatewayConfigured?: boolean;
};

type DebtPayment = {
  id: string;
  amount: { toString(): string };
  createdAt: string;
  paymentType: { name: string };
  cashier: { fullName: string };
  invoiceNumber?: number;
};

type DebtInvoice = {
  id: string;
  invoiceNumber: number;
  total: { toString(): string };
  amountPaid: { toString(): string };
  balanceDue: { toString(): string };
  createdAt: string;
  patient: { fullName: string; phone?: string | null };
  payments: DebtPayment[];
};

type Debtor = {
  patientId: string;
  fullName: string;
  phone: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paidByMethod?: Array<{ method: string; amount: number }>;
  invoices: DebtInvoice[];
};

type DebtStats = {
  totalPatients: number;
  debtorCount: number;
  openInvoiceCount: number;
  totalDebt: number;
};

export function DebtsView({
  accent = "violet",
  showStats = true,
  isActive = true,
  allowDebtCancel = false,
}: {
  accent?: "violet" | "emerald";
  showStats?: boolean;
  isActive?: boolean;
  allowDebtCancel?: boolean;
}) {
  const [stats, setStats] = useState<DebtStats | null>(null);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [selected, setSelected] = useState<Debtor | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<DebtInvoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<DebtInvoice | null>(null);
  const [cancelNote, setCancelNote] = useState("Bemor davolanmaslikka qaror qildi");
  const [searchInput, setSearchInput] = useState("");
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [paymentTypeId, setPaymentTypeId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDebts = useCallback(() => {
    fetch("/api/kassa/debts")
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setDebtors(data.debtors || []);
      });
  }, []);

  useEffect(() => {
    const refresh = () => loadDebts();
    window.addEventListener(KASSA_PAYMENT_COMPLETED, refresh);
    return () => window.removeEventListener(KASSA_PAYMENT_COMPLETED, refresh);
  }, [loadDebts]);

  useEffect(() => {
    if (!isActive) return;
    loadDebts();
    fetch("/api/kassa/payment-types")
      .then((r) => r.json())
      .then((pt) => {
        if (Array.isArray(pt)) {
          setPaymentTypes(pt);
          const cash = pt.find((p: PaymentType) => p.platform === "CASH") || pt[0];
          if (cash) setPaymentTypeId(cash.id);
        }
      });
  }, [isActive, loadDebts]);

  const selectedPayment = paymentTypes.find((p) => p.id === paymentTypeId);
  const isCash = selectedPayment?.platform === "CASH";
  const balanceDue = payingInvoice ? toNumber(payingInvoice.balanceDue) : 0;
  const paidInput = parseFloat(amountPaid || "0");
  const change = isCash ? Math.max(0, paidInput - balanceDue) : 0;

  const filteredDebtors = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return debtors;
    return debtors.filter(
      (debtor) =>
        debtor.fullName.toLowerCase().includes(query) ||
        debtor.phone?.toLowerCase().includes(query)
    );
  }, [debtors, searchInput]);

  async function submitDebtCancel() {
    if (!cancellingInvoice) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/kassa/admin/debts/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: cancellingInvoice.id,
          note: cancelNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Qarz bekor qilinmadi");
        return;
      }

      setCancellingInvoice(null);
      setSelected(null);
      setCancelNote("Bemor davolanmaslikka qaror qildi");
      loadDebts();
      notifyPaymentCompleted();
    } catch {
      setError("Server xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function submitDebtPayment() {
    if (!payingInvoice) return;
    setError("");

    if (!paymentTypeId) {
      setError("To'lov turini tanlang");
      return;
    }

    if (paidInput <= 0) {
      setError("To'lov summasini kiriting");
      return;
    }

    if (!isCash && paidInput > balanceDue) {
      setError(`Maksimal to'lov: ${formatMoney(balanceDue)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/kassa/invoices/${payingInvoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentTypeId,
          amountPaid: paidInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "To'lov saqlanmadi");
        return;
      }

      setPayingInvoice(null);
      setAmountPaid("");
      setSelected(null);
      loadDebts();
      notifyPaymentCompleted();
    } catch {
      setError("Server xatosi");
    } finally {
      setLoading(false);
    }
  }

  if (cancellingInvoice) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setCancellingInvoice(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Orqaga
        </Button>

        <Card className="border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-800">
              Qarzni bekor qilish — Chek #{cancellingInvoice.invoiceNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-xl border bg-rose-50/40 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Bemor</p>
                <p className="font-semibold">{cancellingInvoice.patient.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jami</p>
                <p className="font-semibold">{formatMoney(cancellingInvoice.total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Bekor qilinadigan qarz</p>
                <p className="font-semibold text-rose-600">
                  {formatMoney(cancellingInvoice.balanceDue)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sabab (ixtiyoriy)</Label>
              <Input
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Masalan: bemor davolanmaslikka qaror qildi"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Bu amal chekni bekor qiladi va qarzdorlik ro&apos;yxatidan olib tashlaydi.
              To&apos;langan summa o&apos;zgarishsiz qoladi.
            </p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              variant="destructive"
              className="w-full"
              size="lg"
              disabled={loading}
              onClick={submitDebtCancel}
            >
              {loading ? "Bekor qilinmoqda..." : "Qarzni bekor qilish"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (payingInvoice) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setPayingInvoice(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Orqaga
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>
              Qarz to&apos;lovi — Chek #{payingInvoice.invoiceNumber}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Bemor</p>
                <p className="font-semibold">{payingInvoice.patient.fullName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Jami</p>
                <p className="font-semibold">{formatMoney(payingInvoice.total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Qolgan qarz</p>
                <p className="font-semibold text-rose-600">{formatMoney(balanceDue)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>To&apos;lov turi</Label>
              <PaymentMethodPicker
                types={paymentTypes}
                value={paymentTypeId}
                onChange={setPaymentTypeId}
              />
            </div>

            <div className="space-y-2">
              <Label>To&apos;lov summasi</Label>
              <Input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder={String(balanceDue)}
              />
              <p className="text-xs text-muted-foreground">
                Qisman yoki to&apos;liq to&apos;lashingiz mumkin
              </p>
            </div>

            {change > 0 && (
              <Badge variant="success" className="w-full justify-center py-2">
                Qaytim: {formatMoney(change)}
              </Badge>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full"
              size="lg"
              disabled={loading}
              onClick={submitDebtPayment}
            >
              {loading ? "Saqlanmoqda..." : "To'lovni tasdiqlash"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selected) {
    const allPayments = selected.invoices.flatMap((inv) =>
      inv.payments.map((p) => ({ ...p, invoiceNumber: inv.invoiceNumber }))
    );
    allPayments.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelected(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Ro&apos;yxatga qaytish
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              {selected.fullName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {selected.phone && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {selected.phone}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryBox label="Jami summa" value={formatMoney(selected.totalAmount)} />
              <SummaryBox label="To'langan" value={formatMoney(selected.paidAmount)} />
              <SummaryBox
                label="Qoldiq"
                value={formatMoney(selected.balanceDue)}
                highlight
              />
            </div>
            {selected.paidByMethod && selected.paidByMethod.length > 0 && (
              <p className="text-sm text-emerald-700">
                To&apos;lov usuli: {formatPaidByMethodLabel(selected.paidByMethod)}
              </p>
            )}

            <div>
              <h3 className="mb-3 font-semibold">Ochiq qarzlar</h3>
              <div className="space-y-3">
                {selected.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                  >
                    <div>
                      <p className="font-medium">Chek #{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.createdAt)}
                      </p>
                      <p className="mt-1 text-sm">
                        To&apos;langan: {formatMoney(inv.amountPaid)} /{" "}
                        {formatMoney(inv.total)}
                      </p>
                      {summarizePaidByMethod([inv]).length > 0 && (
                        <p className="mt-1 text-xs text-emerald-700">
                          {formatPaidByMethodLabel(summarizePaidByMethod([inv]))}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-rose-600">
                        {formatMoney(inv.balanceDue)}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setPayingInvoice(inv);
                          setAmountPaid(String(toNumber(inv.balanceDue)));
                        }}
                      >
                        To&apos;lash
                      </Button>
                      {allowDebtCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setCancellingInvoice(inv);
                            setError("");
                          }}
                        >
                          Qarzni bekor qilish
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">To&apos;lovlar tarixi</h3>
              {allPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground">To&apos;lovlar yo&apos;q</p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {allPayments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p>{formatDate(p.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">
                            Chek #{p.invoiceNumber} · {p.paymentType.name}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-emerald-700">
                        {formatMoney(p.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={HandCoins}
        title="Qarzdorlik"
        description="Qisman to'lovlar va ochiq qarzlarni boshqarish"
        accent={accent}
      />

      {showStats && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Jami bemorlar"
            value={String(stats.totalPatients)}
            icon={UserRound}
            variant="violet"
          />
          <StatCard
            label="Qarzdorlar"
            value={String(stats.debtorCount)}
            icon={Wallet}
            variant="amber"
          />
          <StatCard
            label="Jami qarzdorlik"
            value={formatMoney(stats.totalDebt)}
            icon={HandCoins}
            variant="rose"
          />
          <StatCard
            label="Ochiq cheklar"
            value={String(stats.openInvoiceCount)}
            icon={HandCoins}
            variant="sky"
          />
        </div>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Qarzdorlar ro&apos;yxati</CardTitle>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Bemor ismi yoki telefon bo'yicha qidirish"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredDebtors.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {debtors.length === 0
                ? "Hozircha qarzdorlar yo'q"
                : "Qidiruv bo'yicha qarzdor topilmadi"}
            </div>
          ) : (
            <ul className="divide-y">
              {filteredDebtors.map((debtor) => (
                <li key={debtor.patientId}>
                  <button
                    type="button"
                    onClick={() => setSelected(debtor)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{debtor.fullName}</p>
                      {debtor.phone && (
                        <p className="text-xs text-muted-foreground">{debtor.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Jami: {formatMoney(debtor.totalAmount)}
                      </span>
                      <span className="text-emerald-700">
                        To&apos;langan: {formatMoney(debtor.paidAmount)}
                      </span>
                      {debtor.paidByMethod && debtor.paidByMethod.length > 0 && (
                        <span className="max-w-xs text-xs text-emerald-600">
                          {formatPaidByMethodLabel(debtor.paidByMethod)}
                        </span>
                      )}
                      <span className="font-semibold text-rose-600">
                        Qoldiq: {formatMoney(debtor.balanceDue)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-rose-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
