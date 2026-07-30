"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/kassa/ui/page-header";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/kassa/ui/card";
import { Badge } from "@/components/kassa/ui/badge";
import { getLocalDateString } from "@/lib/kassa/date";
import { notifyPaymentCompleted } from "@/lib/kassa/kassa-events";
import { formatDate, formatMoney, toNumber } from "@/lib/kassa/utils";

type RefundPayment = {
  id: string;
  amount: { toString(): string };
  createdAt: string;
  paymentType: { name: string };
  cashier: { fullName: string };
};

type RefundableInvoice = {
  id: string;
  invoiceNumber: number;
  total: { toString(): string };
  amountPaid: { toString(): string };
  balanceDue: { toString(): string };
  status: string;
  createdAt: string;
  patient: { fullName: string; phone?: string | null };
  cashier: { fullName: string };
  payments: RefundPayment[];
};

export function InvoiceRefundsView({ isActive = true }: { isActive?: boolean }) {
  const [dayDate, setDayDate] = useState(getLocalDateString());
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<RefundableInvoice[]>([]);
  const [selected, setSelected] = useState<RefundableInvoice | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState("");
  const [note, setNote] = useState("Bemor davolanmaslikka qaror qildi");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(() => {
    if (!isActive) return;

    const params = new URLSearchParams({ date: dayDate });
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    setError("");
    fetch(`/api/kassa/admin/refunds?${params}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Ma'lumot yuklanmadi");
        setInvoices(data.invoices || []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isActive, dayDate, search]);

  useEffect(() => {
    load();
  }, [load]);

  function paidPayments(invoice: RefundableInvoice) {
    return invoice.payments.filter((payment) => toNumber(payment.amount) > 0);
  }

  function openRefund(invoice: RefundableInvoice, paymentId = "") {
    setSelected(invoice);
    setSelectedPaymentId(paymentId);
    const payments = paidPayments(invoice);
    const defaultAmount = paymentId
      ? toNumber(payments.find((payment) => payment.id === paymentId)?.amount ?? 0)
      : toNumber(invoice.amountPaid);
    setRefundAmount(String(defaultAmount));
    setNote("Bemor davolanmaslikka qaror qildi");
    setError("");
    setSuccess("");
  }

  async function submitRefund() {
    if (!selected) return;

    const amount = parseFloat(refundAmount);
    const payments = paidPayments(selected);
    const maxRefund = selectedPaymentId
      ? toNumber(
          payments.find((payment) => payment.id === selectedPaymentId)?.amount ?? 0
        )
      : toNumber(selected.amountPaid);

    if (Number.isNaN(amount) || amount <= 0) {
      setError("To'g'ri qaytarish summasini kiriting");
      return;
    }

    if (amount > maxRefund) {
      setError(`Maksimal qaytarish: ${formatMoney(maxRefund)}`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/kassa/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: selected.id,
          refundAmount: amount,
          paymentId: selectedPaymentId || undefined,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Qaytarish amalga oshmadi");

      setSuccess(
        `Chek #${selected.invoiceNumber} bo'yicha ${formatMoney(amount)} qaytarildi`
      );
      setSelected(null);
      setSelectedPaymentId("");
      load();
      notifyPaymentCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Qaytarish amalga oshmadi");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={RotateCcw}
        title="Pul qaytarish"
        description="Davolanmaslikka qaror qilgan bemorga qisman yoki to'liq to'lovni qaytarish"
        accent="violet"
      />

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">To&apos;lov qilgan bemorlarni qidirish</CardTitle>
          <div className="grid gap-3 md:grid-cols-[180px_1fr_auto]">
            <div className="space-y-2">
              <Label>Sana</Label>
              <Input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bemor ismi</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ism familiya"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" onClick={load} disabled={loading}>
                Qidirish
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-700">{success}</p>}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">To&apos;lov qilingan cheklar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tanlangan kunda qaytarish mumkin bo&apos;lgan to&apos;lov topilmadi
              </p>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="rounded-xl border p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.patient.fullName}</p>
                      <p className="text-muted-foreground">
                        Chek #{invoice.invoiceNumber} · {formatDate(invoice.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.cashier.fullName} · Jami {formatMoney(invoice.total)}
                      </p>
                      {toNumber(invoice.balanceDue) > 0 && (
                        <Badge variant="outline" className="mt-2 border-rose-200 text-rose-700">
                          Qarz: {formatMoney(invoice.balanceDue)}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-700">
                        {formatMoney(invoice.amountPaid)}
                      </p>
                      <p className="text-xs text-muted-foreground">to&apos;langan</p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2"
                        onClick={() => openRefund(invoice)}
                      >
                        Pul qaytarish
                      </Button>
                    </div>
                  </div>

                  {paidPayments(invoice).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {paidPayments(invoice).map((payment) => (
                        <div
                          key={payment.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
                        >
                          <span className="text-xs text-muted-foreground">
                            {formatDate(payment.createdAt)} · {payment.paymentType.name} ·{" "}
                            {payment.cashier.fullName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatMoney(payment.amount)}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => openRefund(invoice, payment.id)}
                            >
                              Shu to&apos;lovni qaytarish
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {selected && (
          <Card className="border-violet-200 bg-violet-50/30">
            <CardHeader>
              <CardTitle className="text-base text-violet-900">
                Pul qaytarish — Chek #{selected.invoiceNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-white p-4 text-sm">
                <p className="font-semibold">{selected.patient.fullName}</p>
                <p className="mt-1 text-muted-foreground">
                  To&apos;langan: {formatMoney(selected.amountPaid)}
                </p>
                {toNumber(selected.balanceDue) > 0 && (
                  <p className="text-rose-700">
                    Qarz: {formatMoney(selected.balanceDue)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Qaytariladigan summa</Label>
                <Input
                  type="number"
                  min={0}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setRefundAmount(
                        String(
                          selectedPaymentId
                            ? toNumber(
                                selected.payments.find((p) => p.id === selectedPaymentId)
                                  ?.amount ?? 0
                              )
                            : toNumber(selected.amountPaid)
                        )
                      )
                    }
                  >
                    To&apos;liq qaytarish
                  </Button>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Qaytarish tasdiqlangach chek <strong>Qarzdorlik</strong> ro&apos;yxatidan
                olib tashlanadi. Isbot uchun <strong>Cheklar</strong> va{" "}
                <strong>Harakatlar jurnali</strong> da belgi qoladi.
              </p>

              <div className="space-y-2">
                <Label>Sabab</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="button"
                className="w-full"
                disabled={saving}
                onClick={submitRefund}
              >
                {saving ? "Qaytarilmoqda..." : "Pulni qaytarishni tasdiqlash"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
