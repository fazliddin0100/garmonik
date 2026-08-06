"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Badge } from "@/components/kassa/ui/badge";
import { Button } from "@/components/kassa/ui/button";
import { Input } from "@/components/kassa/ui/input";
import { Label } from "@/components/kassa/ui/label";
import { PaymentMethodPicker } from "@/components/kassa/payment/payment-method-picker";
import { formatPaidByMethodLabel, summarizePaidByMethod } from "@/lib/kassa/debts";
import { notifyPaymentCompleted } from "@/lib/kassa/kassa-events";
import { formatDate, formatMoney, toNumber } from "@/lib/kassa/utils";

export type DebtWarningPayment = {
  id: string;
  amount: { toString(): string };
  createdAt: string;
  paymentType: { name: string };
};

export type DebtWarningInvoice = {
  id: string;
  invoiceNumber: number;
  total: { toString(): string };
  amountPaid: { toString(): string };
  balanceDue: { toString(): string };
  createdAt: string;
  patient: { fullName: string; phone?: string | null };
  payments: DebtWarningPayment[];
};

export type DebtWarningDebtor = {
  patientId: string;
  fullName: string;
  phone: string | null;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  paidByMethod?: Array<{ method: string; amount: number }>;
  invoices: DebtWarningInvoice[];
};

type PaymentType = {
  id: string;
  name: string;
  platform: string;
  requiresGateway?: boolean;
  gatewayConfigured?: boolean;
};

type Props = {
  open: boolean;
  debtors: DebtWarningDebtor[];
  onClose: () => void;
  onPaid: () => void;
};

export function normalizePersonName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Qo'lda kiritilgan ism/telefon bo'yicha qarzdorlarni topadi. */
export function findDebtorsByManualEntry(
  debtors: DebtWarningDebtor[],
  fullName: string,
  phone?: string,
): DebtWarningDebtor[] {
  const name = normalizePersonName(fullName);
  if (name.length < 3) return [];

  const nameTokens = name.split(" ").filter(Boolean);
  const phoneDigits = (phone || "").replace(/\D/g, "");
  const phoneHint =
    phoneDigits.length >= 9 ? phoneDigits.slice(-9) : phoneDigits.length >= 7 ? phoneDigits : "";

  return debtors.filter((debtor) => {
    const debtorName = normalizePersonName(debtor.fullName);
    const exactName = debtorName === name;
    const tokenMatch =
      nameTokens.length >= 2 && nameTokens.every((token) => debtorName.includes(token));
    const phoneMatch =
      Boolean(phoneHint) &&
      Boolean(debtor.phone) &&
      debtor.phone!.replace(/\D/g, "").includes(phoneHint);

    return exactName || tokenMatch || (phoneMatch && debtorName.includes(nameTokens[0] || name));
  });
}

export function DebtWarningModal({ open, debtors, onClose, onPaid }: Props) {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [paymentTypeId, setPaymentTypeId] = useState("");
  const [payingInvoice, setPayingInvoice] = useState<DebtWarningInvoice | null>(null);
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localDebtors, setLocalDebtors] = useState(debtors);

  useEffect(() => {
    if (!open) return;
    setLocalDebtors(debtors);
    setPayingInvoice(null);
    setAmountPaid("");
    setError("");
  }, [open, debtors]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/kassa/payment-types")
      .then((r) => r.json())
      .then((pt) => {
        if (!Array.isArray(pt)) return;
        setPaymentTypes(pt);
        const cash = pt.find((p: PaymentType) => p.platform === "CASH") || pt[0];
        if (cash) setPaymentTypeId(cash.id);
      })
      .catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !payingInvoice) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, payingInvoice]);

  if (!open || localDebtors.length === 0) return null;

  const selectedPayment = paymentTypes.find((p) => p.id === paymentTypeId);
  const isCash = selectedPayment?.platform === "CASH";
  const balanceDue = payingInvoice ? toNumber(payingInvoice.balanceDue) : 0;
  const paidInput = parseFloat(amountPaid || "0");
  const change = isCash ? Math.max(0, paidInput - balanceDue) : 0;

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

      notifyPaymentCompleted();
      onPaid();

      const refreshed = await fetch("/api/kassa/debts").then((r) => r.json());
      const patientIds = new Set(localDebtors.map((d) => d.patientId));
      const next = ((refreshed.debtors || []) as DebtWarningDebtor[]).filter((d) =>
        patientIds.has(d.patientId),
      );

      if (next.length === 0) {
        onClose();
        return;
      }

      setLocalDebtors(next);
      setPayingInvoice(null);
      setAmountPaid("");
    } catch {
      setError("Server xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Yopish"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={() => {
          if (!payingInvoice) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-warning-title"
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rose-100 bg-gradient-to-r from-rose-50 to-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/25">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="debt-warning-title" className="text-lg font-semibold text-rose-900">
                Bemorda ochiq qarz bor
              </h2>
              <p className="mt-1 text-sm text-rose-800/80">
                Yangi to&apos;lovdan oldin avvalgi qarzdorlikni tekshiring. Agar bemor qarzini
                to&apos;layotgan bo&apos;lsa, pastdagi &quot;To&apos;lash&quot; orqali qabul qiling.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {payingInvoice ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPayingInvoice(null);
                  setError("");
                }}
              >
                Orqaga
              </Button>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold">
                  Qarz to&apos;lovi — Chek #{payingInvoice.invoiceNumber}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {payingInvoice.patient.fullName}
                </p>
                <p className="mt-2 text-sm">
                  Qolgan qarz:{" "}
                  <span className="font-semibold text-rose-600">{formatMoney(balanceDue)}</span>
                </p>
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
              </div>

              {change > 0 ? (
                <Badge variant="success" className="w-full justify-center py-2">
                  Qaytim: {formatMoney(change)}
                </Badge>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <Button
                type="button"
                className="w-full"
                size="lg"
                disabled={loading}
                onClick={submitDebtPayment}
              >
                {loading ? "Saqlanmoqda..." : "To'lovni tasdiqlash"}
              </Button>
            </div>
          ) : (
            localDebtors.map((debtor) => (
              <div key={debtor.patientId} className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{debtor.fullName}</p>
                    {debtor.phone ? (
                      <p className="text-xs text-muted-foreground">{debtor.phone}</p>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-rose-600">
                    Jami qoldiq: {formatMoney(debtor.balanceDue)}
                  </p>
                </div>

                <div className="space-y-3">
                  {debtor.invoices.map((inv) => (
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
                        {summarizePaidByMethod([inv]).length > 0 ? (
                          <p className="mt-1 text-xs text-emerald-700">
                            {formatPaidByMethodLabel(summarizePaidByMethod([inv]))}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-rose-600">
                          {formatMoney(inv.balanceDue)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setPayingInvoice(inv);
                            setAmountPaid(String(toNumber(inv.balanceDue)));
                            setError("");
                          }}
                        >
                          To&apos;lash
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {!payingInvoice ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Agar bu yangi to&apos;lov bo&apos;lsa, ogohlantirishni yopib davom etishingiz mumkin.
            </p>
            <Button type="button" variant="outline" onClick={onClose}>
              Tushundim, davom etish
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
