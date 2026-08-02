'use client';

import { Button } from '@/components/ui/button';
import {
  Activity,
  CalendarRange,
  CreditCard,
  Download,
  Loader2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';

type PeriodId = 'daily' | 'monthly' | 'halfYear' | 'yearly';

type MoneyPoint = {
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
};

type ReportResponse = {
  period: PeriodId;
  year: number;
  month?: number;
  totals: {
    revenue: number;
    expenses: number;
    profit: number;
    transactions: number;
    invoices: number;
  };
  points: MoneyPoint[];
  error?: string;
};

function asCsv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\n');
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = '\ufeff' + asCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

export default function ReportsFinancialPanel() {
  const [period, setPeriod] = useState<PeriodId>('monthly');
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportResponse | null>(null);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [now, now - 1, now - 2, now - 3];
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      period,
      year: String(selectedYear),
      month: String(selectedMonth),
    });
    void (async () => {
      try {
        const res = await fetch(`/api/admin/financial-reports?${params}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = (await res.json()) as ReportResponse;
        if (!res.ok) {
          setData(null);
          toast.error(json.error || 'Hisobot yuklanmadi');
          return;
        }
        setData(json);
      } catch {
        setData(null);
        toast.error('Tarmoq xatoligi');
      } finally {
        setLoading(false);
      }
    })();
  }, [period, selectedMonth, selectedYear]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = data?.points ?? [];
  const totals = data?.totals ?? {
    revenue: 0,
    expenses: 0,
    profit: 0,
    transactions: 0,
    invoices: 0,
  };

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['Moliyaviy hisobot (kassa)', String(period)],
      ['Yil', selectedYear],
      ['Oy', period === 'daily' ? selectedMonth : '—'],
      ['Tranzaksiyalar', totals.transactions],
      ['Cheklar', totals.invoices],
      [],
      ['Nuqta', 'Kirim (to‘lovlar)', 'Chiqim (xarajatlar)', 'Foyda'],
      ...chartData.map((c) => [c.label, c.revenue, c.expenses, c.profit]),
      [],
      ['Jami kirim', totals.revenue],
      ['Jami chiqim', totals.expenses],
      ['Sof foyda', totals.profit],
    ];
    downloadCsv(`moliyaviy-hisobot-${selectedYear}-${period}.csv`, rows);
  }

  const periodTabs: { id: PeriodId; label: string }[] = [
    { id: 'daily', label: 'Kunlik' },
    { id: 'monthly', label: 'Oylik' },
    { id: 'halfYear', label: 'Yarim yillik' },
    { id: 'yearly', label: 'Yillik' },
  ];

  return (
    <div className="mt-3 space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-violet-200/60 bg-linear-to-br from-white via-violet-50/40 to-cyan-50/50 p-6 shadow-xl shadow-violet-200/40 backdrop-blur">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-400/15 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600/90">
              Moliyaviy analitika
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Klinika hisobotlari
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Ma&apos;lumotlar kassa tizimidagi real to&apos;lovlar va
              xarajatlardan olinadi — demo yoki taxminiy raqamlar yo&apos;q.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap gap-1 rounded-2xl border border-white/80 bg-white/70 p-1 shadow-inner shadow-slate-200/60">
              {periodTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPeriod(t.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all md:text-sm ${
                    period === t.id ?
                      'bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Hisobot yili"
                title="Hisobot yili"
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(Number.parseInt(e.target.value, 10))
                }
                className="h-10 rounded-xl border border-violet-200/80 bg-white/90 px-3 text-sm text-slate-700 shadow-sm outline-none ring-violet-300 focus:ring-2">
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y} yil
                  </option>
                ))}
              </select>
              {period === 'daily' && (
                <select
                  aria-label="Hisobot oyi"
                  title="Hisobot oyi"
                  value={selectedMonth}
                  onChange={(e) =>
                    setSelectedMonth(Number.parseInt(e.target.value, 10))
                  }
                  className="h-10 rounded-xl border border-violet-200/80 bg-white/90 px-3 text-sm text-slate-700 shadow-sm outline-none ring-violet-300 focus:ring-2">
                  {MONTH_UZ.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <Button
                type="button"
                className="h-10 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={exportCsv}
                disabled={loading || !data}>
                <Download className="size-4" />
                CSV
              </Button>
            </div>
          </div>
        </div>
      </section>

      {loading ?
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-100 bg-white/80 py-20 text-sm text-slate-500">
          <Loader2 className="size-5 animate-spin" />
          Hisobot yuklanmoqda…
        </div>
      : <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Kirim (to&apos;lovlar)
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {totals.revenue.toLocaleString('uz-UZ')}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-600">
                    <CreditCard className="size-3.5" />
                    {totals.invoices} ta chek · {totals.transactions} tranzaksiya
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Wallet className="size-5" />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Chiqim (xarajatlar)
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {totals.expenses.toLocaleString('uz-UZ')}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <TrendingDown className="size-3.5" />
                    Kassa xarajatlari
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                  <Activity className="size-5" />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur sm:col-span-2 xl:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Sof foyda</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                    {totals.profit.toLocaleString('uz-UZ')}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-cyan-700">
                    <TrendingUp className="size-3.5" />
                    Kirim − chiqim
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800">
                  <TrendingUp className="size-5" />
                </span>
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-200/50 backdrop-blur">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-800">
                <CalendarRange className="size-5 text-violet-600" />
                <h3 className="text-lg font-semibold">
                  {period === 'daily' &&
                    `Kunlik — ${selectedYear} / ${MONTH_UZ[selectedMonth - 1]}`}
                  {period === 'monthly' && `Oylik — ${selectedYear}`}
                  {period === 'halfYear' && `Yarim yillik — ${selectedYear}`}
                  {period === 'yearly' && 'Yillik taqqoslash'}
                </h3>
              </div>
              <p className="text-xs text-slate-500">So&apos;m · kassa ma&apos;lumotlari</p>
            </div>
            <div className="h-[min(420px,70vw)] w-full min-h-70">
              {chartData.length === 0 ?
                <p className="flex h-full items-center justify-center text-sm text-slate-500">
                  Tanlangan davrda to&apos;lov yoki xarajat yo&apos;q.
                </p>
              : <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="repPay" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        `${Number(value ?? 0).toLocaleString('uz-UZ')} so'm`
                      }
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Kirim"
                      stroke="#06b6d4"
                      fill="url(#repRev)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      name="Chiqim"
                      stroke="#f59e0b"
                      fill="url(#repPay)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              }
            </div>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-xl shadow-slate-200/50 backdrop-blur">
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              Foyda taqqoslash
            </h3>
            <div className="h-[min(320px,60vw)] w-full min-h-56">
              {chartData.length === 0 ?
                <p className="flex h-full items-center justify-center text-sm text-slate-500">
                  Ma&apos;lumot yo&apos;q
                </p>
              : <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                    />
                    <Tooltip
                      formatter={(value) =>
                        `${Number(value ?? 0).toLocaleString('uz-UZ')} so'm`
                      }
                    />
                    <Legend />
                    <Bar dataKey="profit" name="Foyda" fill="#8b5cf6" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              }
            </div>
          </section>
        </>
      }
    </div>
  );
}
