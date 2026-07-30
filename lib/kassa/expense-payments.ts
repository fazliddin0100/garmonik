import type { ExpenseStatus, PaymentType } from ".prisma/kassa-client";
import {
  chargePaymentGateway,
  resolvePaymentType,
} from "./invoice-payments";
import { prisma } from "./prisma";
import { toNumber } from "./utils";

export type ExpensePaymentInput = {
  paymentTypeId: string;
  amount: number;
};

export function computeExpenseStatus(
  total: number,
  amountPaid: number
): ExpenseStatus {
  if (amountPaid >= total) {
    return "PAID";
  }
  if (amountPaid > 0) {
    return "PARTIALLY_PAID";
  }
  return "PARTIALLY_PAID";
}

export async function recordExpensePayment(params: {
  expenseId: string;
  createdById: string;
  paymentType: PaymentType;
  amount: number;
  createdAt?: Date;
}) {
  return prisma.expensePayment.create({
    data: {
      expenseId: params.expenseId,
      createdById: params.createdById,
      paymentTypeId: params.paymentType.id,
      amount: params.amount,
      ...(params.createdAt ? { createdAt: params.createdAt } : {}),
    },
    include: {
      paymentType: true,
      createdBy: { select: { fullName: true } },
    },
  });
}

export async function createExpenseWithPayment(params: {
  category: string;
  categoryDetail?: string | null;
  amount: number;
  amountPaid: number;
  payeeName?: string | null;
  description?: string | null;
  date: Date;
  paymentTypeId: string;
  createdById: string;
}) {
  const paymentType = await resolvePaymentType(params.paymentTypeId);
  const total = params.amount;
  const paid = Math.min(params.amountPaid, total);

  if (paid <= 0) {
    throw new Error("To'lov summasi 0 dan katta bo'lishi kerak");
  }

  const balanceDue = Math.max(0, total - paid);
  const status = computeExpenseStatus(total, paid);

  await chargePaymentGateway({
    paymentType,
    amount: paid,
    reference: `EXP-${Date.now()}-${params.createdById.slice(-6)}`,
    description: params.payeeName?.trim() || params.category,
  });

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        category: params.category,
        categoryDetail: params.categoryDetail,
        amount: total,
        amountPaid: paid,
        balanceDue,
        payeeName: params.payeeName?.trim() || null,
        status,
        description: params.description,
        date: params.date,
        paymentTypeId: paymentType.id,
        createdById: params.createdById,
      },
    });

    await tx.expensePayment.create({
      data: {
        expenseId: created.id,
        createdById: params.createdById,
        paymentTypeId: paymentType.id,
        amount: paid,
      },
    });

    return tx.expense.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        createdBy: { select: { fullName: true } },
        paymentType: { select: { id: true, name: true, platform: true } },
        payments: {
          orderBy: { createdAt: "asc" },
          include: {
            paymentType: { select: { id: true, name: true, platform: true } },
            createdBy: { select: { fullName: true } },
          },
        },
      },
    });
  });

  return expense;
}

export async function applyExpensePayment(params: {
  expenseId: string;
  createdById: string;
  payment: ExpensePaymentInput;
}) {
  const expense = await prisma.expense.findUnique({
    where: { id: params.expenseId },
  });

  if (!expense) {
    throw new Error("Xarajat topilmadi");
  }

  if (expense.status !== "PARTIALLY_PAID") {
    throw new Error("Bu xarajat uchun qarz qolmagan");
  }

  const balanceDue = toNumber(expense.balanceDue);
  if (balanceDue <= 0) {
    throw new Error("Bu xarajat uchun qarz qolmagan");
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

  await chargePaymentGateway({
    paymentType,
    amount: appliedAmount,
    reference: `EXP-PAY-${Date.now()}-${params.createdById.slice(-6)}`,
    description: expense.payeeName?.trim() || expense.category,
  });

  const newAmountPaid = toNumber(expense.amountPaid) + appliedAmount;
  const newBalanceDue = Math.max(0, toNumber(expense.amount) - newAmountPaid);
  const status = computeExpenseStatus(toNumber(expense.amount), newAmountPaid);

  const [paymentRecord, updatedExpense] = await prisma.$transaction([
    prisma.expensePayment.create({
      data: {
        expenseId: expense.id,
        createdById: params.createdById,
        paymentTypeId: paymentType.id,
        amount: appliedAmount,
      },
      include: {
        paymentType: true,
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.expense.update({
      where: { id: expense.id },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status,
        paymentTypeId: paymentType.id,
      },
      include: {
        createdBy: { select: { fullName: true } },
        paymentType: { select: { id: true, name: true, platform: true } },
        payments: {
          orderBy: { createdAt: "asc" },
          include: {
            paymentType: { select: { id: true, name: true, platform: true } },
            createdBy: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  return { paymentRecord, expense: updatedExpense };
}
