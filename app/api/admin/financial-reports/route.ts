import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  getDailySeries,
  getDateRange,
  getExpenseDailySeries,
  getExpenseReport,
  getRevenueReport,
  mergeFinancialSeries,
  type ReportPeriod,
} from '@/lib/kassa/reports';
import { NextRequest, NextResponse } from 'next/server';

type UiPeriod = 'daily' | 'monthly' | 'halfYear' | 'yearly';

function allowedAdmin(rg: string): boolean {
  return rg === 'admin_only' || rg === 'marketing' || rg === 'superadmin';
}

function monthRange(year: number, month1: number) {
  const mm = String(month1).padStart(2, '0');
  const lastDay = new Date(year, month1, 0).getDate();
  const start = new Date(`${year}-${mm}-01T00:00:00+05:00`);
  const end = new Date(
    `${year}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:00`,
  );
  return { start, end };
}

function yearRange(year: number) {
  const start = new Date(`${year}-01-01T00:00:00+05:00`);
  const end = new Date(`${year}-12-31T23:59:59.999+05:00`);
  return { start, end };
}

function mapUiPeriod(period: UiPeriod): ReportPeriod {
  if (period === 'daily') return 'day';
  if (period === 'monthly') return 'month';
  if (period === 'halfYear') return 'half_year';
  return 'year';
}

/** Admin panel — kassa to‘lov/xarajatlaridan real moliyaviy hisobot */
export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session || !allowedAdmin(session.routeGroup)) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'monthly') as UiPeriod;
    const year = Number.parseInt(
      searchParams.get('year') || String(new Date().getFullYear()),
      10,
    );
    const month = Number.parseInt(
      searchParams.get('month') || String(new Date().getMonth() + 1),
      10,
    );

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Yil noto‘g‘ri' }, { status: 400 });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Oy noto‘g‘ri' }, { status: 400 });
    }

    if (period === 'daily') {
      const { start, end } = monthRange(year, month);
      const [revenue, expenses, dailySeries, expenseDailySeries] =
        await Promise.all([
          getRevenueReport({ start, end }),
          getExpenseReport(start, end),
          getDailySeries(start, end),
          getExpenseDailySeries(start, end),
        ]);
      const financialSeries = mergeFinancialSeries(
        dailySeries,
        expenseDailySeries,
      );
      const points = financialSeries.map((d) => {
        const [, m, day] = d.date.split('-');
        return {
          label: `${day}.${m}`,
          revenue: d.kirim,
          expenses: d.chiqim,
          profit: d.foyda,
        };
      });
      return NextResponse.json({
        period,
        year,
        month,
        totals: {
          revenue: revenue.grandTotal,
          expenses: expenses.total,
          profit: revenue.grandTotal - expenses.total,
          transactions: revenue.transactionCount,
          invoices: revenue.invoices,
        },
        points,
      });
    }

    if (period === 'monthly') {
      const { start, end } = yearRange(year);
      const [revenue, expenses, dailySeries, expenseDailySeries] =
        await Promise.all([
          getRevenueReport({ start, end }),
          getExpenseReport(start, end),
          getDailySeries(start, end),
          getExpenseDailySeries(start, end),
        ]);
      const financialSeries = mergeFinancialSeries(
        dailySeries,
        expenseDailySeries,
      );
      const MONTH_UZ = [
        'Yan',
        'Fev',
        'Mar',
        'Apr',
        'May',
        'Iyun',
        'Iyul',
        'Avg',
        'Sen',
        'Okt',
        'Noy',
        'Dek',
      ];
      const buckets = MONTH_UZ.map((label) => ({
        label,
        revenue: 0,
        expenses: 0,
        profit: 0,
      }));
      for (const d of financialSeries) {
        const m = Number.parseInt(d.date.slice(5, 7), 10) - 1;
        if (m < 0 || m > 11) continue;
        buckets[m]!.revenue += d.kirim;
        buckets[m]!.expenses += d.chiqim;
        buckets[m]!.profit += d.foyda;
      }
      return NextResponse.json({
        period,
        year,
        totals: {
          revenue: revenue.grandTotal,
          expenses: expenses.total,
          profit: revenue.grandTotal - expenses.total,
          transactions: revenue.transactionCount,
          invoices: revenue.invoices,
        },
        points: buckets,
      });
    }

    if (period === 'halfYear') {
      const h1 = getDateRange('half_year', new Date(`${year}-03-15T12:00:00+05:00`));
      const h2 = getDateRange('half_year', new Date(`${year}-09-15T12:00:00+05:00`));
      const [r1, e1, r2, e2] = await Promise.all([
        getRevenueReport({ start: h1.start, end: h1.end }),
        getExpenseReport(h1.start, h1.end),
        getRevenueReport({ start: h2.start, end: h2.end }),
        getExpenseReport(h2.start, h2.end),
      ]);
      const points = [
        {
          label: '1-yarim yil',
          revenue: r1.grandTotal,
          expenses: e1.total,
          profit: r1.grandTotal - e1.total,
        },
        {
          label: '2-yarim yil',
          revenue: r2.grandTotal,
          expenses: e2.total,
          profit: r2.grandTotal - e2.total,
        },
      ];
      const revenueTotal = r1.grandTotal + r2.grandTotal;
      const expenseTotal = e1.total + e2.total;
      return NextResponse.json({
        period,
        year,
        totals: {
          revenue: revenueTotal,
          expenses: expenseTotal,
          profit: revenueTotal - expenseTotal,
          transactions: r1.transactionCount + r2.transactionCount,
          invoices: r1.invoices + r2.invoices,
        },
        points,
      });
    }

    // yearly — oxirgi 3 yil
    const years = [year - 2, year - 1, year];
    const points = [];
    let revenueTotal = 0;
    let expenseTotal = 0;
    let transactions = 0;
    let invoices = 0;
    for (const y of years) {
      const { start, end } = yearRange(y);
      const [revenue, expenses] = await Promise.all([
        getRevenueReport({ start, end }),
        getExpenseReport(start, end),
      ]);
      revenueTotal += revenue.grandTotal;
      expenseTotal += expenses.total;
      transactions += revenue.transactionCount;
      invoices += revenue.invoices;
      points.push({
        label: String(y),
        revenue: revenue.grandTotal,
        expenses: expenses.total,
        profit: revenue.grandTotal - expenses.total,
      });
    }

    return NextResponse.json({
      period: 'yearly',
      year,
      kassaPeriod: mapUiPeriod(period),
      totals: {
        revenue: revenueTotal,
        expenses: expenseTotal,
        profit: revenueTotal - expenseTotal,
        transactions,
        invoices,
      },
      points,
    });
  } catch (e) {
    console.error('admin financial-reports:', e);
    return NextResponse.json({ error: 'Serverda xatolik' }, { status: 500 });
  }
}
