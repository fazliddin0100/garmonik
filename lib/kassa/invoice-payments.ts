import type { InvoiceStatus, PaymentPlatform, PaymentType } from ".prisma/kassa-client";
import { processGatewayPayment, requiresPaymentGateway } from "./payment-gateway";
import { prisma } from "./prisma";
import { toNumber } from "./utils";

export type PaymentInput = {
  paymentTypeId: string;
  amount: number;
  changeAmount?: number;
};

export async function resolvePaymentType(paymentTypeId: string) {
  const paymentType = await prisma.paymentType.findUnique({
    where: { id: paymentTypeId },
  });
  if (!paymentType) {
    throw new Error("To'lov turi topilmadi");
  }
  return paymentType;
}

export async function chargePaymentGateway(params: {
  paymentType: PaymentType;
  amount: number;
  reference: string;
  description: string;
}) {
  if (!requiresPaymentGateway(params.paymentType.platform)) {
    return;
  }

  if (!params.paymentType.gatewayHost?.trim()) {
    return;
  }

  const gatewayResult = await processGatewayPayment({
    host: params.paymentType.gatewayHost,
    port: params.paymentType.gatewayPort,
    path: params.paymentType.gatewayPath,
    platform: params.paymentType.platform,
    amount: params.amount,
    reference: params.reference,
    description: params.description,
  });

  if (!gatewayResult.success) {
    throw new Error(
      gatewayResult.error || "To'lov terminali orqali to'lov amalga oshmadi"
    );
  }
}

export function computeCashChange(
  paymentType: PaymentType,
  amount: number,
  dueAmount: number,
  allowOverpay: boolean
) {
  if (paymentType.platform !== "CASH") {
    return 0;
  }
  if (allowOverpay) {
    return Math.max(0, amount - dueAmount);
  }
  return 0;
}

export function computeInvoiceStatus(
  total: number,
  amountPaid: number
): InvoiceStatus {
  if (amountPaid >= total) {
    return "PAID";
  }
  if (total > 0) {
    return "PARTIALLY_PAID";
  }
  return "PENDING";
}

export async function recordInvoicePayment(params: {
  invoiceId: string;
  cashierId: string;
  paymentType: PaymentType;
  amount: number;
  changeAmount?: number;
  createdAt?: Date;
}) {
  return prisma.invoicePayment.create({
    data: {
      invoiceId: params.invoiceId,
      cashierId: params.cashierId,
      paymentTypeId: params.paymentType.id,
      amount: params.amount,
      changeAmount: params.changeAmount ?? 0,
      ...(params.createdAt ? { createdAt: params.createdAt } : {}),
    },
    include: {
      paymentType: true,
      cashier: { select: { fullName: true } },
    },
  });
}

export async function applyInvoicePayment(params: {
  invoiceId: string;
  cashierId: string;
  payment: PaymentInput;
  patientName: string;
  note?: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { patient: true },
  });

  if (!invoice) {
    throw new Error("Chek topilmadi");
  }

  if (invoice.status !== "PARTIALLY_PAID") {
    throw new Error("Bu chek uchun qarz qolmagan");
  }

  const balanceDue = toNumber(invoice.balanceDue);
  if (balanceDue <= 0) {
    throw new Error("Bu chek uchun qarz qolmagan");
  }

  const paymentType = await resolvePaymentType(params.payment.paymentTypeId);
  const isCash = paymentType.platform === "CASH";
  const allowOverpay = isCash;
  const paymentAmount = params.payment.amount;

  if (paymentAmount <= 0) {
    throw new Error("To'lov summasi 0 dan katta bo'lishi kerak");
  }

  if (!allowOverpay && paymentAmount > balanceDue) {
    throw new Error(`Maksimal to'lov: ${balanceDue.toLocaleString("uz-UZ")} so'm`);
  }

  const appliedAmount = allowOverpay
    ? Math.min(paymentAmount, balanceDue)
    : paymentAmount;

  const changeAmount = computeCashChange(
    paymentType,
    paymentAmount,
    balanceDue,
    allowOverpay
  );

  await chargePaymentGateway({
    paymentType,
    amount: appliedAmount,
    reference: `INV-PAY-${Date.now()}-${params.cashierId.slice(-6)}`,
    description: invoice.patient.fullName || params.patientName,
  });

  const newAmountPaid = toNumber(invoice.amountPaid) + appliedAmount;
  const newBalanceDue = Math.max(0, toNumber(invoice.total) - newAmountPaid);
  const status = computeInvoiceStatus(toNumber(invoice.total), newAmountPaid);
  const trimmedNote = params.note?.trim();
  const referralNote = trimmedNote
    ? [invoice.referralNote, `Qarz to'lovi: ${trimmedNote}`].filter(Boolean).join(" | ")
    : invoice.referralNote;

  const [paymentRecord, updatedInvoice] = await prisma.$transaction([
    prisma.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        cashierId: params.cashierId,
        paymentTypeId: paymentType.id,
        amount: appliedAmount,
        changeAmount,
      },
      include: {
        paymentType: true,
        cashier: { select: { fullName: true } },
      },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status,
        paymentTypeId: paymentType.id,
        changeAmount: isCash ? changeAmount : 0,
        referralNote,
      },
      include: {
        patient: true,
        paymentType: true,
        cashier: { select: { fullName: true } },
        items: { include: { service: true } },
        payments: {
          orderBy: { createdAt: "asc" },
          include: {
            paymentType: true,
            cashier: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  return { paymentRecord, invoice: updatedInvoice };
}

export function allocatePaymentToServices(
  items: Array<{ subtotal: { toString(): string } }>,
  invoiceTotal: number,
  paymentAmount: number
) {
  if (invoiceTotal <= 0) {
    return items.map(() => 0);
  }

  return items.map((item) => {
    const ratio = toNumber(item.subtotal) / invoiceTotal;
    return paymentAmount * ratio;
  });
}

export function sumPaymentsByPlatform(
  payments: Array<{
    amount: { toString(): string };
    paymentType: { platform: PaymentPlatform };
  }>
) {
  const byPlatform: Record<PaymentPlatform, { total: number; count: number }> = {
    CASH: { total: 0, count: 0 },
    HUMO: { total: 0, count: 0 },
    VISA: { total: 0, count: 0 },
    UZCARD: { total: 0, count: 0 },
    TERMINAL: { total: 0, count: 0 },
    CLICK: { total: 0, count: 0 },
    PAYME: { total: 0, count: 0 },
    CUSTOM: { total: 0, count: 0 },
  };

  for (const payment of payments) {
    const platform = payment.paymentType.platform;
    const amount = toNumber(payment.amount);
    byPlatform[platform].total += amount;
    if (amount > 0) {
      byPlatform[platform].count += 1;
    }
  }

  return byPlatform;
}
