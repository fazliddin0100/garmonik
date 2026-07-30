import { NextResponse } from "next/server";
import { requireSession } from "@/lib/kassa/auth";
import { prisma } from "@/lib/kassa/prisma";
import { getDebtStats } from "@/lib/kassa/debts";
import { getDateRange, getExpenseReport, getPeriodDebtSummary, getRevenueReport } from "@/lib/kassa/reports";

export async function GET() {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { start, end } = getDateRange("day");
  const [revenue, expenses, paymentCount, debtStats, periodDebt] = await Promise.all([
    getRevenueReport({ start, end }),
    getExpenseReport(start, end),
    prisma.invoicePayment.count({
      where: { createdAt: { gte: start, lte: end }, amount: { gt: 0 } },
    }),
    getDebtStats(),
    getPeriodDebtSummary(start, end),
  ]);

  return NextResponse.json({
    revenue: revenue.grandTotal,
    expenses: expenses.total,
    invoiceCount: paymentCount,
    profit: revenue.grandTotal - expenses.total - periodDebt.totalDebt,
    debtStats,
  });
}
