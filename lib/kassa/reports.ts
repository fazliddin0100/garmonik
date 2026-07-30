import { PaymentPlatform, Prisma } from ".prisma/kassa-client";
import { prisma } from "./prisma";
import { getInvoiceItemLabel } from "./custom-service";
import { openPatientDebtWhere } from "./debts";
import {
  allocatePaymentToServices,
  sumPaymentsByPlatform,
} from "./invoice-payments";
import { getDayRangeForDate, getDayRangeFromDateString, getLocalDateString } from "./date";
import { toNumber } from "./utils";

function getServiceReportKey(item: {
  serviceId: string;
  customLabel?: string | null;
}) {
  const custom = item.customLabel?.trim();
  return custom ? `custom:${custom.toLowerCase()}` : item.serviceId;
}

export type ServicePayer = {
  patientName: string;
  amount: number;
  invoiceNumber: number;
  paidAt: string;
  paymentMethod: string;
};

export type IncomePaymentRow = {
  id: string;
  patientName: string;
  amount: number;
  paymentMethod: string;
  platform: string;
  paidAt: string;
  invoiceNumber: number;
  servicesSummary: string;
};

export type ServiceRevenueRow = {
  name: string;
  count: number;
  total: number;
  isCustom: boolean;
  payers: ServicePayer[];
};

export type ServiceRefundRow = {
  name: string;
  count: number;
  total: number;
  refunds: Array<{
    patientName: string;
    amount: number;
    invoiceNumber: number;
    refundedAt: string;
    paymentMethod: string;
  }>;
};

export type ReportPeriod = "day" | "month" | "half_year" | "year";

export function getDateRange(
  period: ReportPeriod,
  refDate = new Date(),
  dayDateStr?: string
) {
  if (period === "day") {
    if (dayDateStr) return getDayRangeFromDateString(dayDateStr);
    return getDayRangeForDate(refDate);
  }

  const dateStr = getLocalDateString(refDate);
  const [year, month] = dateStr.split("-").map(Number);

  const end = new Date(`${dateStr}T23:59:59.999+05:00`);
  let start = new Date(`${dateStr}T00:00:00+05:00`);

  if (period === "month") {
    start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:00`);
    const lastDay = new Date(year, month, 0).getDate();
    end.setTime(new Date(`${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59.999+05:00`).getTime());
    return { start, end };
  }

  if (period === "half_year") {
    const halfStartMonth = month <= 6 ? 1 : 7;
    const halfEndMonth = month <= 6 ? 6 : 12;
    const halfEndDay = new Date(year, halfEndMonth, 0).getDate();
    start = new Date(`${year}-${String(halfStartMonth).padStart(2, "0")}-01T00:00:00+05:00`);
    end.setTime(
      new Date(`${year}-${String(halfEndMonth).padStart(2, "0")}-${String(halfEndDay).padStart(2, "0")}T23:59:59.999+05:00`).getTime()
    );
    return { start, end };
  }

  start = new Date(`${year}-01-01T00:00:00+05:00`);
  end.setTime(new Date(`${year}-12-31T23:59:59.999+05:00`).getTime());
  return { start, end };
}

async function getLegacyRefundAdjustment(start: Date, end: Date) {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: "ADMIN_REFUND_INVOICE",
      createdAt: { gte: start, lte: end },
    },
  });

  let adjustment = 0;

  for (const log of logs) {
    if (!log.entityId) continue;

    let refundAmount = 0;
    try {
      const parsed = JSON.parse(log.details || "{}") as { refundAmount?: number };
      refundAmount = Number(parsed.refundAmount) || 0;
    } catch {
      continue;
    }
    if (refundAmount <= 0) continue;

    const negativePayment = await prisma.invoicePayment.findFirst({
      where: {
        invoiceId: log.entityId,
        amount: { lt: 0 },
        createdAt: { gte: new Date(log.createdAt.getTime() - 60_000) },
      },
    });
    if (negativePayment) continue;

    const [positiveSum, invoice] = await Promise.all([
      prisma.invoicePayment.aggregate({
        where: { invoiceId: log.entityId, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      prisma.invoice.findUnique({
        where: { id: log.entityId },
        select: { amountPaid: true },
      }),
    ]);

    if (!invoice) continue;

    const positiveTotal = toNumber(positiveSum._sum.amount ?? 0);
    const amountPaid = toNumber(invoice.amountPaid);
    const unreflected = positiveTotal - amountPaid;
    if (unreflected > 0) {
      adjustment += Math.min(refundAmount, unreflected);
    }
  }

  return adjustment;
}

export async function getRevenueReport(params: {
  start: Date;
  end: Date;
  cashierId?: string;
}) {
  const paymentWhere: Prisma.InvoicePaymentWhereInput = {
    createdAt: { gte: params.start, lte: params.end },
  };
  if (params.cashierId) paymentWhere.cashierId = params.cashierId;

  const payments = await prisma.invoicePayment.findMany({
    where: paymentWhere,
    include: {
      paymentType: true,
      invoice: {
        include: {
          patient: true,
          items: { include: { service: true } },
        },
      },
    },
  });

  const byPlatform = sumPaymentsByPlatform(payments);

  let grandTotal = 0;
  let grossTotal = 0;
  let refundTotal = 0;
  const incomeServices: Record<string, ServiceRevenueRow> = {};
  const refundServices: Record<string, ServiceRefundRow> = {};

  for (const payment of payments) {
    const paymentAmount = toNumber(payment.amount);
    grandTotal += paymentAmount;
    if (paymentAmount > 0) {
      grossTotal += paymentAmount;
    } else if (paymentAmount < 0) {
      refundTotal += Math.abs(paymentAmount);
    }

    const inv = payment.invoice;
    const invTotal = toNumber(inv.total);
    const isRefund = paymentAmount < 0;
    const allocationBase = isRefund ? Math.abs(paymentAmount) : paymentAmount;
    const allocations = allocatePaymentToServices(inv.items, invTotal, allocationBase);

    inv.items.forEach((item, index) => {
      const allocated = allocations[index];
      if (allocated === 0) return;

      const key = getServiceReportKey(item);
      const name = getInvoiceItemLabel(item);

      if (isRefund) {
        if (!refundServices[key]) {
          refundServices[key] = { name, count: 0, total: 0, refunds: [] };
        }
        refundServices[key].total += allocated;
        refundServices[key].count += 1;
        refundServices[key].refunds.push({
          patientName: inv.patient.fullName,
          amount: allocated,
          invoiceNumber: inv.invoiceNumber,
          refundedAt: payment.createdAt.toISOString(),
          paymentMethod: payment.paymentType.name,
        });
        return;
      }

      if (!incomeServices[key]) {
        incomeServices[key] = {
          name,
          count: 0,
          total: 0,
          isCustom: Boolean(item.customLabel?.trim()),
          payers: [],
        };
      }
      incomeServices[key].total += allocated;
      incomeServices[key].payers.push({
        patientName: inv.patient.fullName,
        amount: allocated,
        invoiceNumber: inv.invoiceNumber,
        paidAt: payment.createdAt.toISOString(),
        paymentMethod: payment.paymentType.name,
      });
      if (allocated >= toNumber(item.subtotal) * 0.99) {
        incomeServices[key].count += item.quantity;
      }
    });
  }

  const legacyRefundAdjustment = await getLegacyRefundAdjustment(
    params.start,
    params.end
  );
  if (legacyRefundAdjustment > 0) {
    grandTotal -= legacyRefundAdjustment;
    refundTotal += legacyRefundAdjustment;
  }

  const topServices = Object.entries(incomeServices)
    .map(([key, service]) => ({
      ...service,
      total: service.total - (refundServices[key]?.total ?? 0),
      payers: [...service.payers].sort((a, b) => b.amount - a.amount),
    }))
    .filter((service) => service.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const refundedServices = Object.values(refundServices)
    .map((service) => ({
      ...service,
      refunds: [...service.refunds].sort((a, b) => b.amount - a.amount),
    }))
    .filter((service) => service.total > 0)
    .sort((a, b) => b.total - a.total);

  const customServices = Object.entries(incomeServices)
    .filter(([key, service]) => {
      if (!service.isCustom) return false;
      const net = service.total - (refundServices[key]?.total ?? 0);
      return net > 0;
    })
    .map(([key, service]) => ({
      ...service,
      total: service.total - (refundServices[key]?.total ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  const transactionCount = payments.filter(
    (payment) => toNumber(payment.amount) > 0
  ).length;
  const averagePayment =
    transactionCount > 0 ? grossTotal / transactionCount : 0;

  const invoiceIds = new Set(
    payments
      .filter((payment) => toNumber(payment.amount) > 0)
      .map((payment) => payment.invoiceId)
  );

  const incomePayments: IncomePaymentRow[] = payments
    .filter((payment) => toNumber(payment.amount) > 0)
    .map((payment) => ({
      id: payment.id,
      patientName: payment.invoice.patient.fullName,
      amount: toNumber(payment.amount),
      paymentMethod: payment.paymentType.name,
      platform: payment.paymentType.platform,
      paidAt: payment.createdAt.toISOString(),
      invoiceNumber: payment.invoice.invoiceNumber,
      servicesSummary: payment.invoice.items
        .map((item) => getInvoiceItemLabel(item))
        .join(", "),
    }))
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  return {
    byPlatform,
    grossTotal,
    refundTotal,
    grandTotal,
    transactionCount,
    averagePayment,
    topServices,
    refundedServices,
    customServices,
    incomePayments,
    invoices: invoiceIds.size,
  };
}

export async function getDailySeries(
  start: Date,
  end: Date,
  cashierId?: string
) {
  const where: Prisma.InvoicePaymentWhereInput = {
    createdAt: { gte: start, lte: end },
  };
  if (cashierId) where.cashierId = cashierId;

  const payments = await prisma.invoicePayment.findMany({
    where,
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, number>();
  for (const payment of payments) {
    const key = getLocalDateString(payment.createdAt);
    map.set(key, (map.get(key) ?? 0) + toNumber(payment.amount));
  }

  return Array.from(map.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }));
}

export async function getHourlyBusyStats(start: Date, end: Date) {
  const payments = await prisma.invoicePayment.findMany({
    where: {
      createdAt: { gte: start, lte: end },
    },
    select: { createdAt: true },
  });

  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, "0")}:00`,
    count: 0,
  }));

  for (const payment of payments) {
    const h = payment.createdAt.getHours();
    hours[h].count += 1;
  }

  return hours;
}

export async function getCashierComparison(start: Date, end: Date) {
  const grouped = await prisma.invoicePayment.groupBy({
    by: ["cashierId"],
    where: {
      createdAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
    _count: true,
  });

  const cashiers = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.cashierId) } },
    select: { id: true, fullName: true },
  });

  const nameMap = Object.fromEntries(
    cashiers.map((c) => [c.id, c.fullName])
  );

  return grouped.map((g) => ({
    cashierId: g.cashierId,
    cashierName: nameMap[g.cashierId] ?? "Noma'lum",
    total: toNumber(g._sum.amount ?? 0),
    count: g._count,
  }));
}

export async function getExpenseReport(start: Date, end: Date) {
  const [expenses, payments, debtStats] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        createdBy: { select: { fullName: true } },
        paymentType: { select: { name: true, platform: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.expensePayment.findMany({
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
    }),
    prisma.expense.aggregate({
      where: { status: "PARTIALLY_PAID" },
      _sum: { balanceDue: true },
      _count: true,
    }),
  ]);

  const byCategory: Record<string, number> = {};
  let totalCommitted = 0;

  for (const e of expenses) {
    const amt = toNumber(e.amount);
    totalCommitted += amt;
    const label =
      e.category === "Boshqa" && e.categoryDetail
        ? `Boshqa: ${e.categoryDetail}`
        : e.category;
    byCategory[label] = (byCategory[label] ?? 0) + amt;
  }

  const categoryBreakdown = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  let totalPaid = 0;
  for (const payment of payments) {
    totalPaid += toNumber(payment.amount);
  }

  const byPlatform = sumPaymentsByPlatform(payments);
  const transactionCount = payments.length;
  const averagePayment = transactionCount > 0 ? totalPaid / transactionCount : 0;

  const paymentHistory = payments.map((p) => ({
    id: p.id,
    amount: toNumber(p.amount),
    createdAt: p.createdAt,
    payeeName: p.expense.payeeName,
    category: p.expense.category,
    categoryDetail: p.expense.categoryDetail,
    paymentTypeName: p.paymentType.name,
    createdByName: p.createdBy.fullName,
  }));

  return {
    expenses,
    byCategory,
    categoryBreakdown,
    byPlatform,
    transactionCount,
    averagePayment,
    total: totalPaid,
    totalCommitted,
    totalPaid,
    paymentHistory,
    openDebt: {
      count: debtStats._count,
      total: toNumber(debtStats._sum.balanceDue ?? 0),
    },
  };
}

export async function getExpenseDailySeries(start: Date, end: Date) {
  const payments = await prisma.expensePayment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, number>();
  for (const payment of payments) {
    const key = getLocalDateString(payment.createdAt);
    map.set(key, (map.get(key) ?? 0) + toNumber(payment.amount));
  }

  return Array.from(map.entries()).map(([date, expense]) => ({ date, expense }));
}

export async function getPeriodDebtSummary(start: Date, end: Date) {
  const debtStats = await prisma.invoice.aggregate({
    where: {
      createdAt: { gte: start, lte: end },
      ...openPatientDebtWhere,
    },
    _sum: { balanceDue: true },
    _count: true,
  });

  return {
    openInvoiceCount: debtStats._count,
    totalDebt: toNumber(debtStats._sum.balanceDue ?? 0),
  };
}

export function mergeFinancialSeries(
  revenueSeries: Array<{ date: string; revenue: number }>,
  expenseSeries: Array<{ date: string; expense: number }>
) {
  const dates = new Set([
    ...revenueSeries.map((d) => d.date),
    ...expenseSeries.map((d) => d.date),
  ]);

  const revenueMap = Object.fromEntries(revenueSeries.map((d) => [d.date, d.revenue]));
  const expenseMap = Object.fromEntries(expenseSeries.map((d) => [d.date, d.expense]));

  return Array.from(dates)
    .sort()
    .map((date) => ({
      date,
      kirim: revenueMap[date] ?? 0,
      chiqim: expenseMap[date] ?? 0,
      foyda: (revenueMap[date] ?? 0) - (expenseMap[date] ?? 0),
    }));
}
