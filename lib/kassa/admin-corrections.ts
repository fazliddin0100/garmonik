import { computeExpenseStatus } from "./expense-payments";
import { computeInvoiceStatus } from "./invoice-payments";
import { getDateRangeFromStrings, getDayRangeFromDateString, getMonthRangeFromString, parseClinicDateString } from "./date";
import { OTHER_EXPENSE_CATEGORY } from "./expenses";
import { prisma } from "./prisma";
import { toNumber } from "./utils";
import type { InvoiceStatus, Prisma } from ".prisma/kassa-client";

const invoiceInclude = {
  patient: true,
  paymentType: true,
  cashier: { select: { fullName: true } },
  items: { include: { service: true } },
  payments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      paymentType: true,
      cashier: { select: { fullName: true } },
    },
  },
};

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

export async function syncInvoiceFinancials(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    throw new Error("Chek topilmadi");
  }

  const total = toNumber(invoice.total);
  const amountPaid =
    invoice.payments.length > 0
      ? invoice.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
      : toNumber(invoice.amountPaid);
  const balanceDue = Math.max(0, total - amountPaid);
  const status = computeInvoiceStatus(total, amountPaid);

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid, balanceDue, status },
    include: invoiceInclude,
  });
}

export async function syncExpenseFinancials(expenseId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { payments: true },
  });

  if (!expense) {
    throw new Error("Xarajat topilmadi");
  }

  const total = toNumber(expense.amount);
  const amountPaid =
    expense.payments.length > 0
      ? expense.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
      : toNumber(expense.amountPaid);
  const balanceDue = Math.max(0, total - amountPaid);
  const status = computeExpenseStatus(total, amountPaid);

  return prisma.expense.update({
    where: { id: expenseId },
    data: { amountPaid, balanceDue, status },
    include: expenseInclude,
  });
}

export async function correctInvoicePaymentAmount(
  paymentId: string,
  amount: number
) {
  if (amount < 0) {
    throw new Error("Summa manfiy bo'lishi mumkin emas");
  }

  const payment = await prisma.invoicePayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("To'lov topilmadi");
  }

  await prisma.invoicePayment.update({
    where: { id: paymentId },
    data: { amount },
  });

  return syncInvoiceFinancials(payment.invoiceId);
}

export async function correctInvoiceAmounts(
  invoiceId: string,
  data: { total?: number; discount?: number; amountPaid?: number }
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    throw new Error("Chek topilmadi");
  }

  const update: {
    total?: number;
    discount?: number;
    subtotal?: number;
    amountPaid?: number;
  } = {};

  if (data.total != null) {
    if (data.total <= 0) {
      throw new Error("Jami summa 0 dan katta bo'lishi kerak");
    }
    const discount = data.discount ?? toNumber(invoice.discount);
    update.total = data.total;
    update.discount = discount;
    update.subtotal = data.total + discount;
  } else if (data.discount != null) {
    if (data.discount < 0) {
      throw new Error("Chegirma manfiy bo'lishi mumkin emas");
    }
    const total = toNumber(invoice.total);
    update.discount = data.discount;
    update.subtotal = total + data.discount;
  }

  if (data.amountPaid != null) {
    if (data.amountPaid < 0) {
      throw new Error("To'langan summa manfiy bo'lishi mumkin emas");
    }
    if (invoice.payments.length > 0) {
      throw new Error(
        "Bu chekda alohida to'lovlar bor. Avval to'lov summasini tahrirlang"
      );
    }
    update.amountPaid = data.amountPaid;
  }

  if (Object.keys(update).length === 0) {
    throw new Error("O'zgartirish uchun kamida bitta summa kiriting");
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: update,
  });

  return syncInvoiceFinancials(invoiceId);
}

export async function correctExpenseAmount(expenseId: string, amount: number) {
  if (amount <= 0) {
    throw new Error("Xarajat summasi 0 dan katta bo'lishi kerak");
  }

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense) {
    throw new Error("Xarajat topilmadi");
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: { amount },
  });

  return syncExpenseFinancials(expenseId);
}

export async function correctExpensePaymentAmount(
  paymentId: string,
  amount: number
) {
  if (amount < 0) {
    throw new Error("Summa manfiy bo'lishi mumkin emas");
  }

  const payment = await prisma.expensePayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new Error("To'lov topilmadi");
  }

  await prisma.expensePayment.update({
    where: { id: paymentId },
    data: { amount },
  });

  return syncExpenseFinancials(payment.expenseId);
}

export async function correctExpensePaidAmount(
  expenseId: string,
  amountPaid: number
) {
  if (amountPaid < 0) {
    throw new Error("To'langan summa manfiy bo'lishi mumkin emas");
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { payments: true },
  });

  if (!expense) {
    throw new Error("Xarajat topilmadi");
  }

  if (expense.payments.length === 1) {
    await prisma.expensePayment.update({
      where: { id: expense.payments[0].id },
      data: { amount: amountPaid },
    });
  } else if (expense.payments.length > 1) {
    throw new Error(
      "Bir nechta to'lov bor. Har bir to'lovni alohida tahrirlang"
    );
  } else {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { amountPaid },
    });
  }

  return syncExpenseFinancials(expenseId);
}

export async function correctExpenseDetails(
  expenseId: string,
  data: {
    category: string;
    categoryDetail?: string | null;
    amount: number;
    amountPaid: number;
    date: string;
    description?: string | null;
    payeeName?: string | null;
  }
) {
  if (data.amount <= 0) {
    throw new Error("Xarajat summasi 0 dan katta bo'lishi kerak");
  }
  if (data.amountPaid < 0) {
    throw new Error("To'langan summa manfiy bo'lishi mumkin emas");
  }
  if (data.amountPaid > data.amount) {
    throw new Error("To'langan summa jami xarajatdan oshmasligi kerak");
  }
  if (data.category === OTHER_EXPENSE_CATEGORY && !data.categoryDetail?.trim()) {
    throw new Error("Boshqa xarajat turini kiriting");
  }

  const hasDebt = data.amountPaid > 0 && data.amountPaid < data.amount;
  if (hasDebt && !data.payeeName?.trim()) {
    throw new Error("Qisman to'lov uchun kimga qarz ekanligini kiriting");
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: { payments: true },
  });

  if (!expense) {
    throw new Error("Xarajat topilmadi");
  }

  await prisma.expense.update({
    where: { id: expenseId },
    data: {
      category: data.category,
      categoryDetail:
        data.category === OTHER_EXPENSE_CATEGORY
          ? data.categoryDetail?.trim() || null
          : null,
      amount: data.amount,
      date: parseClinicDateString(data.date),
      description: data.description?.trim() || null,
      payeeName: hasDebt ? data.payeeName?.trim() || null : null,
    },
  });

  if (expense.payments.length === 1) {
    await prisma.expensePayment.update({
      where: { id: expense.payments[0].id },
      data: { amount: data.amountPaid },
    });
  } else if (expense.payments.length > 1) {
    const currentPaid = expense.payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0
    );
    if (Math.abs(currentPaid - data.amountPaid) > 0.01) {
      throw new Error(
        "Bir nechta to'lov bor. To'langan summani alohida to'lovlar orqali tahrirlang"
      );
    }
  } else if (expense.payments.length === 0) {
    await prisma.expense.update({
      where: { id: expenseId },
      data: { amountPaid: data.amountPaid },
    });
  }

  return syncExpenseFinancials(expenseId);
}

export async function listIncomeCorrections(params: {
  date?: string;
  from?: string;
  to?: string;
  month?: string;
  search?: string;
}) {
  const where: {
    createdAt?: { gte: Date; lte: Date };
    invoice?: { patient: { fullName: { contains: string; mode: "insensitive" } } };
  } = {};

  if (params.from && params.to) {
    const { start, end } = getDateRangeFromStrings(params.from, params.to);
    where.createdAt = { gte: start, lte: end };
  } else if (params.date) {
    const { start, end } = getDayRangeFromDateString(params.date);
    where.createdAt = { gte: start, lte: end };
  } else if (params.month) {
    const { start, end } = getMonthRangeFromString(params.month);
    where.createdAt = { gte: start, lte: end };
  }

  if (params.search?.trim()) {
    where.invoice = {
      patient: { fullName: { contains: params.search.trim(), mode: "insensitive" } },
    };
  }

  const payments = await prisma.invoicePayment.findMany({
    where,
    include: {
      paymentType: { select: { name: true } },
      cashier: { select: { fullName: true } },
      invoice: {
        include: {
          patient: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const invoiceWhere: {
    createdAt?: { gte: Date; lte: Date };
    payments: { none: Record<string, never> };
    patient?: { fullName: { contains: string; mode: "insensitive" } };
  } = {
    payments: { none: {} },
  };

  if (where.createdAt) {
    invoiceWhere.createdAt = where.createdAt;
  }
  if (params.search?.trim()) {
    invoiceWhere.patient = {
      fullName: { contains: params.search.trim(), mode: "insensitive" },
    };
  }

  const invoicesWithoutPayments = await prisma.invoice.findMany({
    where: invoiceWhere,
    include: {
      patient: { select: { fullName: true } },
      cashier: { select: { fullName: true } },
      paymentType: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { payments, invoicesWithoutPayments };
}

export async function cancelInvoiceDebt(invoiceId: string, note?: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      patient: true,
    },
  });

  if (!invoice) {
    throw new Error("Chek topilmadi");
  }

  if (invoice.status !== "PARTIALLY_PAID" && invoice.status !== "PENDING") {
    throw new Error("Faqat ochiq qarzli chekni bekor qilish mumkin");
  }

  const balanceDue = toNumber(invoice.balanceDue);
  if (balanceDue <= 0) {
    throw new Error("Bu chekda ochiq qarz yo'q");
  }

  const trimmedNote = note?.trim();
  const referralNote = trimmedNote
    ? [invoice.referralNote, `Qarz bekor: ${trimmedNote}`].filter(Boolean).join(" | ")
    : invoice.referralNote;

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "CANCELLED",
      balanceDue: 0,
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
  });
}

const refundableInvoiceInclude = {
  patient: true,
  paymentType: true,
  cashier: { select: { fullName: true } },
  items: { include: { service: true } },
  payments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      paymentType: true,
      cashier: { select: { fullName: true } },
    },
  },
};

export async function listRefundableInvoices(params: {
  date?: string;
  month?: string;
  search?: string;
}) {
  const where: Prisma.InvoiceWhereInput = {
    amountPaid: { gt: 0 },
    status: { in: ["PAID", "PARTIALLY_PAID"] },
  };

  if (params.date) {
    const { start, end } = getDayRangeFromDateString(params.date);
    where.createdAt = { gte: start, lte: end };
  } else if (params.month) {
    const { start, end } = getMonthRangeFromString(params.month);
    where.createdAt = { gte: start, lte: end };
  }

  if (params.search?.trim()) {
    where.patient = {
      fullName: { contains: params.search.trim(), mode: "insensitive" },
    };
  }

  return prisma.invoice.findMany({
    where,
    include: refundableInvoiceInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

function resolveStatusAfterRefund(amountPaid: number): InvoiceStatus {
  return amountPaid <= 0 ? "REFUNDED" : "PAID";
}

export async function refundInvoiceAmount(params: {
  invoiceId: string;
  refundAmount: number;
  adminId: string;
  paymentId?: string;
  note?: string;
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: {
      patient: true,
      payments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!invoice) {
    throw new Error("Chek topilmadi");
  }

  if (invoice.status === "CANCELLED" || invoice.status === "REFUNDED") {
    throw new Error("Bu chek uchun qaytarish mumkin emas");
  }

  const amountPaid = toNumber(invoice.amountPaid);
  if (amountPaid <= 0) {
    throw new Error("Qaytarish uchun to'lov topilmadi");
  }

  if (params.refundAmount <= 0) {
    throw new Error("Qaytarish summasi 0 dan katta bo'lishi kerak");
  }

  if (params.refundAmount > amountPaid) {
    throw new Error(
      `Maksimal qaytarish: ${amountPaid.toLocaleString("uz-UZ")} so'm`
    );
  }

  if (params.paymentId) {
    const payment = invoice.payments.find((item) => item.id === params.paymentId);
    if (!payment) {
      throw new Error("To'lov topilmadi");
    }
    if (toNumber(payment.amount) <= 0) {
      throw new Error("Bu yozuvdan qaytarib bo'lmaydi");
    }
    if (params.refundAmount > toNumber(payment.amount)) {
      throw new Error("Bu to'lovdan ko'p qaytarib bo'lmaydi");
    }
  }

  const newAmountPaid = amountPaid - params.refundAmount;
  const newBalanceDue = 0;
  const status = resolveStatusAfterRefund(newAmountPaid);

  const trimmedNote = params.note?.trim();
  const referralNote = trimmedNote
    ? [
        invoice.referralNote,
        `Pul qaytarildi: ${trimmedNote} (${params.refundAmount.toLocaleString("uz-UZ")} so'm)`,
      ]
        .filter(Boolean)
        .join(" | ")
    : invoice.referralNote;

  return prisma.$transaction(async (tx) => {
    const paymentTypeId =
      (params.paymentId
        ? invoice.payments.find((item) => item.id === params.paymentId)?.paymentTypeId
        : invoice.payments[0]?.paymentTypeId) ?? invoice.paymentTypeId;

    if (!paymentTypeId) {
      throw new Error("To'lov turi topilmadi");
    }

    await tx.invoicePayment.create({
      data: {
        invoiceId: params.invoiceId,
        cashierId: params.adminId,
        paymentTypeId,
        amount: -params.refundAmount,
        changeAmount: 0,
      },
    });

    return tx.invoice.update({
      where: { id: params.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        status,
        referralNote,
        changeAmount: 0,
      },
      include: refundableInvoiceInclude,
    });
  });
}
