"use client";

import { formatDate, formatMoney, toNumber } from "@/lib/kassa/utils";
import { CLINIC_ADDRESS, getClinicName, getReceiptQrValue } from "@/lib/kassa/receipt-branding";
import { getInvoiceItemLabel } from "@/lib/kassa/custom-service";
import { ReceiptQrCode } from "@/components/kassa/receipt/receipt-qr";
import { ReceiptLogo } from "@/components/kassa/receipt/receipt-logo";

export type ReceiptInvoice = {
  id?: string;
  invoiceNumber: number;
  createdAt: string;
  subtotal: number | { toString(): string };
  discount: number | { toString(): string };
  total: number | { toString(): string };
  amountPaid: number | { toString(): string };
  changeAmount: number | { toString(): string };
  balanceDue?: number | { toString(): string } | null;
  status?: string;
  referralNote?: string | null;
  payments?: Array<{
    amount: number | { toString(): string };
    createdAt: string;
    paymentType: { name: string };
  }>;
  patient: { fullName: string; phone?: string | null };
  cashier: { fullName: string };
  paymentType: { name: string; platform: string };
  items: Array<{
    quantity: number;
    unitPrice: number | { toString(): string };
    subtotal: number | { toString(): string };
    customLabel?: string | null;
    service: { name: string };
  }>;
};

export function ReceiptView({
  invoice,
  clinicName,
}: {
  invoice: ReceiptInvoice;
  clinicName?: string;
}) {
  const name = clinicName || getClinicName();
  const isRefunded = invoice.status === "REFUNDED";
  const isCancelled = invoice.status === "CANCELLED";
  const refundSummary = invoice.referralNote?.includes("Pul qaytarildi")
    ? invoice.referralNote
        .split("Pul qaytarildi:")
        .pop()
        ?.split(" | ")[0]
        ?.trim()
    : null;
  const qrValue = getReceiptQrValue({
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    createdAt: invoice.createdAt,
    patientName: invoice.patient.fullName,
  });

  return (
    <div className="receipt-print mx-auto max-w-[80mm] bg-white p-4 font-mono text-xs text-black">
      <ReceiptLogo className="h-16" />

      <div className="border-b border-dashed border-black pb-2 pt-2 text-center">
        <p className="text-sm font-bold uppercase">{name}</p>
        <p className="mt-1 text-[10px] leading-tight">{CLINIC_ADDRESS}</p>
        <p className="mt-1">Kvitansiya / Chek</p>
      </div>

      <div className="mt-2 space-y-1">
        <Row label="Chek №" value={String(invoice.invoiceNumber)} />
        <Row label="Sana" value={formatDate(invoice.createdAt)} />
        <Row label="Kassir" value={invoice.cashier.fullName} />
        <Row label="Bemor" value={invoice.patient.fullName} />
        {invoice.patient.phone && <Row label="Tel" value={invoice.patient.phone} />}
        {isRefunded && (
          <Row label="Holat" value="PUL QAYTARILGAN" bold />
        )}
        {isCancelled && !isRefunded && (
          <Row label="Holat" value="BEKOR QILINGAN" bold />
        )}
        {invoice.referralNote && !refundSummary && (
          <Row label="Yo'nalish" value={invoice.referralNote} />
        )}
        {refundSummary && (
          <Row label="Qaytarish" value={refundSummary} />
        )}
      </div>

      <div className="my-2 border-t border-dashed border-black pt-2">
        <p className="mb-1 font-semibold">Xizmatlar:</p>
        {invoice.items.map((item, i) => (
          <div key={i} className="mb-1">
            <p>{getInvoiceItemLabel(item)}</p>
            <p className="text-[10px]">
              {item.quantity} x {formatMoney(toNumber(item.unitPrice))} ={" "}
              {formatMoney(toNumber(item.subtotal))}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black pt-2">
        <Row label="Jami" value={formatMoney(toNumber(invoice.subtotal))} />
        {toNumber(invoice.discount) > 0 && (
          <Row label="Chegirma" value={`-${formatMoney(toNumber(invoice.discount))}`} />
        )}
        <Row label="TO'LOV" value={formatMoney(toNumber(invoice.total))} bold />
        <Row label="To'lov turi" value={invoice.paymentType.name} />
        <Row label="Berildi" value={formatMoney(toNumber(invoice.amountPaid))} />
        {toNumber(invoice.balanceDue ?? 0) > 0 && (
          <Row label="QARZ (qoldiq)" value={formatMoney(toNumber(invoice.balanceDue!))} bold />
        )}
        {toNumber(invoice.changeAmount) > 0 && (
          <Row label="Qaytim" value={formatMoney(toNumber(invoice.changeAmount))} />
        )}
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="mt-2 border-t border-dashed border-black pt-2">
          <p className="mb-1 font-semibold">To&apos;lovlar tarixi:</p>
          {invoice.payments.map((payment, i) => {
            const amount = toNumber(payment.amount);
            const label = amount < 0 ? "Qaytarish" : payment.paymentType.name;
            return (
              <p key={i} className="text-[10px]">
                {formatDate(payment.createdAt)} — {label}: {formatMoney(amount)}
              </p>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-[10px]">Rahmat! Sog&apos;ligingiz uchun!</p>

      <div className="mt-3 border-t border-dashed border-black pt-3">
        <ReceiptQrCode value={qrValue} label={`Chek #${invoice.invoiceNumber}`} />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span>{label}:</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
