import { prisma } from "./prisma";
import { formatMoney, toNumber } from "./utils";

export type PaidByMethod = {
  method: string;
  amount: number;
};

export function summarizePaidByMethod(
  invoices: Array<{
    payments: Array<{
      amount: { toString(): string };
      paymentType: { name: string };
    }>;
  }>
): PaidByMethod[] {
  const map = new Map<string, number>();

  for (const invoice of invoices) {
    for (const payment of invoice.payments) {
      const amount = toNumber(payment.amount);
      if (amount <= 0) continue;
      const method = payment.paymentType.name;
      map.set(method, (map.get(method) ?? 0) + amount);
    }
  }

  return Array.from(map.entries())
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export function formatPaidByMethodLabel(methods: PaidByMethod[]) {
  if (methods.length === 0) return "—";
  return methods.map((m) => `${m.method}: ${formatMoney(m.amount)}`).join(" · ");
}

async function repairMisclassifiedRefundedInvoices() {
  await prisma.invoice.updateMany({
    where: {
      status: "PARTIALLY_PAID",
      amountPaid: { lte: 0 },
      OR: [
        { referralNote: { contains: "Pul qaytarildi" } },
        { payments: { some: { amount: { lt: 0 } } } },
      ],
    },
    data: {
      status: "REFUNDED",
      balanceDue: 0,
    },
  });
}

/** Ochiq bemor qarzi: qisman to'langan, qoldiq > 0 (0 so'm boshlang'ich to'lov ham kiradi). */
export const openPatientDebtWhere = {
  status: "PARTIALLY_PAID" as const,
  balanceDue: { gt: 0 },
};

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

export async function getDebtStats() {
  await repairMisclassifiedRefundedInvoices();

  const openDebtWhere = openPatientDebtWhere;

  const [totalPatients, openInvoices] = await Promise.all([
    prisma.patient.count(),
    prisma.invoice.findMany({
      where: openDebtWhere,
      select: {
        patientId: true,
        total: true,
        amountPaid: true,
        balanceDue: true,
      },
    }),
  ]);

  const debtorIds = new Set(openInvoices.map((inv) => inv.patientId));
  let totalDebt = 0;
  let totalBilled = 0;
  let totalPaid = 0;

  for (const inv of openInvoices) {
    totalDebt += toNumber(inv.balanceDue);
    totalBilled += toNumber(inv.total);
    totalPaid += toNumber(inv.amountPaid);
  }

  return {
    totalPatients,
    debtorCount: debtorIds.size,
    openInvoiceCount: openInvoices.length,
    totalDebt,
    totalBilled,
    totalPaid,
  };
}

export async function getDebtorsGrouped() {
  await repairMisclassifiedRefundedInvoices();

  const openInvoices = await prisma.invoice.findMany({
    where: openPatientDebtWhere,
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });

  const grouped = new Map<
    string,
    {
      patientId: string;
      fullName: string;
      phone: string | null;
      totalAmount: number;
      paidAmount: number;
      balanceDue: number;
      paidByMethod: PaidByMethod[];
      invoices: typeof openInvoices;
    }
  >();

  for (const invoice of openInvoices) {
    const key = invoice.patientId;
    const existing = grouped.get(key);
    const total = toNumber(invoice.total);
    const paid = toNumber(invoice.amountPaid);
    const balance = toNumber(invoice.balanceDue);

    if (existing) {
      existing.totalAmount += total;
      existing.paidAmount += paid;
      existing.balanceDue += balance;
      existing.invoices.push(invoice);
      continue;
    }

    grouped.set(key, {
      patientId: invoice.patientId,
      fullName: invoice.patient.fullName,
      phone: invoice.patient.phone,
      totalAmount: total,
      paidAmount: paid,
      balanceDue: balance,
      paidByMethod: [],
      invoices: [invoice],
    });
  }

  return Array.from(grouped.values())
    .map((debtor) => ({
      ...debtor,
      paidByMethod: summarizePaidByMethod(debtor.invoices),
    }))
    .sort((a, b) => b.balanceDue - a.balanceDue);
}

export async function getPatientDebtDetail(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    return null;
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      patientId,
      status: { in: ["PARTIALLY_PAID", "PAID"] },
    },
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });

  const openInvoices = invoices.filter(
    (inv) =>
      inv.status === "PARTIALLY_PAID" && toNumber(inv.balanceDue) > 0
  );
  const payments = invoices.flatMap((inv) =>
    inv.payments.map((payment) => ({
      ...payment,
      invoiceNumber: inv.invoiceNumber,
    }))
  );

  payments.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const totalAmount = openInvoices.reduce((sum, inv) => sum + toNumber(inv.total), 0);
  const paidAmount = openInvoices.reduce((sum, inv) => sum + toNumber(inv.amountPaid), 0);
  const balanceDue = openInvoices.reduce((sum, inv) => sum + toNumber(inv.balanceDue), 0);

  return {
    patient,
    stats: {
      totalAmount,
      paidAmount,
      balanceDue,
      openInvoiceCount: openInvoices.length,
    },
    invoices,
    payments,
  };
}
