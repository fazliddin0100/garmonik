import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/kassa/auth";
import { getLocalDateString, getDateRangeFromStrings } from "@/lib/kassa/date";
import { getDebtorsGrouped, getDebtStats } from "@/lib/kassa/debts";
import { getExpenseDebtsGrouped, getExpenseDebtStats } from "@/lib/kassa/expense-debts";
import {
  getRevenueReport,
  getDailySeries,
  getHourlyBusyStats,
  getCashierComparison,
  getExpenseReport,
  getExpenseDailySeries,
  getPeriodDebtSummary,
  mergeFinancialSeries,
  getDateRange,
  type ReportPeriod,
} from "@/lib/kassa/reports";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "day") as ReportPeriod;
  const dateParam = searchParams.get("date")?.trim();
  const fromParam = searchParams.get("from")?.trim();
  const toParam = searchParams.get("to")?.trim();
  const ref = dateParam
    ? new Date(`${dateParam}T12:00:00+05:00`)
    : fromParam
      ? new Date(`${fromParam}T12:00:00+05:00`)
      : new Date();

  const cashierId =
    session.role === "CASHIER"
      ? session.id
      : searchParams.get("cashierId") || undefined;

  if (period !== "day" && session.role === "CASHIER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { start, end } =
    period === "day" && fromParam && toParam
      ? getDateRangeFromStrings(fromParam, toParam)
      : getDateRange(
          period,
          ref,
          period === "day" ? dateParam : undefined
        );
  const includeClinicFinance =
    session.role === "ADMIN" || period === "day";

  const [
    revenue,
    dailySeries,
    hourly,
    cashiers,
    expenses,
    expenseDailySeries,
    periodDebt,
    debtStats,
    debtors,
    expenseDebtStats,
    expenseDebts,
  ] = await Promise.all([
    getRevenueReport({ start, end, cashierId }),
    getDailySeries(start, end, cashierId),
    session.role === "ADMIN"
      ? getHourlyBusyStats(start, end)
      : Promise.resolve([]),
    session.role === "ADMIN"
      ? getCashierComparison(start, end)
      : Promise.resolve([]),
    includeClinicFinance
      ? getExpenseReport(start, end)
      : Promise.resolve({
          expenses: [],
          byCategory: {},
          categoryBreakdown: [],
          byPlatform: {},
          transactionCount: 0,
          averagePayment: 0,
          total: 0,
          totalCommitted: 0,
          totalPaid: 0,
          paymentHistory: [],
          openDebt: { count: 0, total: 0 },
        }),
    includeClinicFinance
      ? getExpenseDailySeries(start, end)
      : Promise.resolve([]),
    includeClinicFinance
      ? getPeriodDebtSummary(start, end)
      : Promise.resolve({ openInvoiceCount: 0, totalDebt: 0 }),
    session.role === "ADMIN" ? getDebtStats() : Promise.resolve(null),
    session.role === "ADMIN" ? getDebtorsGrouped() : Promise.resolve([]),
    session.role === "ADMIN" ? getExpenseDebtStats() : Promise.resolve(null),
    session.role === "ADMIN" ? getExpenseDebtsGrouped() : Promise.resolve([]),
  ]);

  const financialSeries =
    includeClinicFinance
      ? mergeFinancialSeries(dailySeries, expenseDailySeries)
      : dailySeries.map((d) => ({
          date: d.date,
          kirim: d.revenue,
          chiqim: 0,
          foyda: d.revenue,
        }));

  const profit = includeClinicFinance
    ? revenue.grandTotal - expenses.total - periodDebt.totalDebt
    : undefined;

  return NextResponse.json({
    period,
    date:
      period === "day"
        ? fromParam && toParam
          ? { from: fromParam, to: toParam }
          : dateParam ?? getLocalDateString(ref)
        : undefined,
    start,
    end,
    revenue,
    dailySeries,
    expenseDailySeries,
    financialSeries,
    hourly,
    cashiers,
    expenses,
    profit,
    periodDebt: includeClinicFinance ? periodDebt : undefined,
    debts:
      session.role === "ADMIN" && debtStats
        ? { stats: debtStats, debtors }
        : undefined,
    expenseDebts:
      session.role === "ADMIN" && expenseDebtStats
        ? { stats: expenseDebtStats, debts: expenseDebts }
        : undefined,
  });
}
