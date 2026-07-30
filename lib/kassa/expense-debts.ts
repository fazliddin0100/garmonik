import { prisma } from "./prisma";
import { toNumber } from "./utils";

const expenseInclude = {
  createdBy: { select: { fullName: true } },
  paymentType: { select: { id: true, name: true, platform: true } },
  payments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      paymentType: { select: { id: true, name: true, platform: true } },
      createdBy: { select: { fullName: true } },
    },
  },
};

export async function getExpenseDebtStats() {
  const openExpenses = await prisma.expense.findMany({
    where: { status: "PARTIALLY_PAID" },
    select: {
      payeeName: true,
      amount: true,
      amountPaid: true,
      balanceDue: true,
    },
  });

  const payeeIds = new Set(
    openExpenses.map((e) => e.payeeName?.trim() || "Noma'lum")
  );

  let totalDebt = 0;
  let totalCommitted = 0;
  let totalPaid = 0;

  for (const expense of openExpenses) {
    totalDebt += toNumber(expense.balanceDue);
    totalCommitted += toNumber(expense.amount);
    totalPaid += toNumber(expense.amountPaid);
  }

  return {
    openExpenseCount: openExpenses.length,
    payeeCount: payeeIds.size,
    totalDebt,
    totalCommitted,
    totalPaid,
  };
}

export async function getExpenseDebtsGrouped() {
  const openExpenses = await prisma.expense.findMany({
    where: { status: "PARTIALLY_PAID" },
    include: expenseInclude,
    orderBy: { date: "desc" },
  });

  const grouped = new Map<
    string,
    {
      payeeName: string;
      totalAmount: number;
      paidAmount: number;
      balanceDue: number;
      expenses: typeof openExpenses;
    }
  >();

  for (const expense of openExpenses) {
    const key = expense.payeeName?.trim() || "Noma'lum";
    const existing = grouped.get(key);
    const total = toNumber(expense.amount);
    const paid = toNumber(expense.amountPaid);
    const balance = toNumber(expense.balanceDue);

    if (existing) {
      existing.totalAmount += total;
      existing.paidAmount += paid;
      existing.balanceDue += balance;
      existing.expenses.push(expense);
      continue;
    }

    grouped.set(key, {
      payeeName: key,
      totalAmount: total,
      paidAmount: paid,
      balanceDue: balance,
      expenses: [expense],
    });
  }

  return Array.from(grouped.values()).sort((a, b) => b.balanceDue - a.balanceDue);
}

export async function getExpenseDebtPaymentsInRange(start: Date, end: Date) {
  return prisma.expensePayment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: {
      paymentType: { select: { name: true, platform: true } },
      createdBy: { select: { fullName: true } },
      expense: {
        select: {
          category: true,
          categoryDetail: true,
          payeeName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
