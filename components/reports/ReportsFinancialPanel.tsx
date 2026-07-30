'use client';

import { Button } from '@/components/ui/button';
import { fetchClinicResource } from '@/lib/clinic-data/client';
import { type ContractRow } from '@/lib/contracts/types';
import type { PatientRow } from '@/lib/patients/types';
import { type PharmacyProduct } from '@/lib/pharmacy/types';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import {
  Activity,
  CalendarRange,
  CreditCard,
  Download,
  Pill,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
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

type PeriodId = 'daily' | 'monthly' | 'halfYear' | 'yearly';

type MoneyPoint = {
  label: string;
  patientPayments: number;
  pharmacySales: number;
  expenses: number;
  revenue: number;
};

function parseUzDate(date: string): Date | null {
  const parts = date.split('.');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => Number.parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
}

function moneyFromText(amount: string) {
  const sanitized = amount.replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mix01(...parts: number[]) {
  let h = 2166136261;
  for (const p of parts) {
    h ^= p;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function estimatePharmacyRetail(p: PharmacyProduct): number {
  return 2_500 + p.rowNum * 380 + p.packageCount * 120;
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function contractDays(c: ContractRow): number {
  const a = parseUzDate(c.date);
  const b = parseUzDate(c.endDate);
  if (!a || !b) return 1;
  const ms = Math.max(0, b.getTime() - a.getTime());
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

function contractDailyRate(c: ContractRow) {
  return moneyFromText(c.amount) / contractDays(c);
}

/** Sana oralig'ida shartnoma kuniga to'g'ri keladigan xarajat */
function expenseForCalendarDay(
  year: number,
  month0: number,
  day: number,
  contracts: ContractRow[],
) {
  const t = new Date(year, month0, day).getTime();
  let sum = 0;
  for (const c of contracts) {
    const a = parseUzDate(c.date);
    const b = parseUzDate(c.endDate);
    if (!a || !b) continue;
    if (t < a.getTime() || t > b.getTime()) continue;
    sum += contractDailyRate(c);
  }
  return sum;
}

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
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [pharmacy, setPharmacy] = useState<PharmacyProduct[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePriceRow[]>([]);

  const [period, setPeriod] = useState<PeriodId>('monthly');
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const [nextContracts, nextPharmacy, nextPatients, nextPrices] =
            await Promise.all([
              fetchClinicResource<ContractRow[]>('contracts').catch(() => []),
              fetchClinicResource<PharmacyProduct[]>('pharmacy-products').catch(
                () => [],
              ),
              fetchClinicResource<PatientRow[]>('patients').catch(() => []),
              fetchClinicResource<ServicePriceRow[]>('service-prices').catch(
                () => [],
              ),
            ]);
          startTransition(() => {
            if (cancelled) return;
            setContracts(Array.isArray(nextContracts) ? nextContracts : []);
            setPharmacy(Array.isArray(nextPharmacy) ? nextPharmacy : []);
            setPatients(Array.isArray(nextPatients) ? nextPatients : []);
            setServicePrices(Array.isArray(nextPrices) ? nextPrices : []);
          });
        } catch {
          /* ignore */
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const avgServicePrice = useMemo(() => {
    const n = servicePrices.length || 1;
    return servicePrices.reduce((s, r) => s + r.price, 0) / n;
  }, [servicePrices]);

  const avgPharmacyBasket = useMemo(() => {
    if (!pharmacy.length) return 85_000;
    const total = pharmacy.reduce((s, p) => s + estimatePharmacyRetail(p), 0);
    return total / pharmacy.length;
  }, [pharmacy]);

  const activePatientFactor = useMemo(
    () => Math.max(14, Math.round(patients.length * 0.42)),
    [patients.length],
  );

  const years = useMemo(() => {
    const fromContracts = contracts
      .map((c) => parseUzDate(c.date)?.getFullYear() ?? null)
      .filter((y): y is number => y !== null);
    const now = new Date().getFullYear();
    return [...new Set([now, now - 1, now - 2, ...fromContracts])].sort(
      (a, b) => b - a,
    );
  }, [contracts]);

  const dailySeries = useMemo(() => {
    const y = selectedYear;
    const m0 = selectedMonth - 1;
    const dim = daysInMonth(y, m0);
    const out: MoneyPoint[] = [];
    for (let d = 1; d <= dim; d += 1) {
      const v = mix01(y, m0 + 1, d);
      const v2 = mix01(y, m0 + 1, d, 7);
      const visits = Math.round(activePatientFactor * (0.28 + 0.62 * v));
      const patientPayments = Math.round(
        visits * avgServicePrice * (0.82 + 0.28 * v2),
      );
      const pharmacySales = Math.round(
        visits *
          avgPharmacyBasket *
          0.38 *
          (0.55 + 0.55 * mix01(y, m0 + 1, d, 3)),
      );
      const contractExpense = Math.round(
        expenseForCalendarDay(y, m0, d, contracts),
      );
      const operational = Math.round(
        55_000 + patients.length * 420 + pharmacy.length * 180,
      );
      const expenses = Math.round(
        contractExpense + operational * (0.75 + 0.35 * mix01(y, m0 + 1, d, 9)),
      );
      const revenue = patientPayments + pharmacySales;
      out.push({
        label: `${String(d).padStart(2, '0')}.${String(selectedMonth).padStart(2, '0')}`,
        patientPayments,
        pharmacySales,
        expenses,
        revenue,
      });
    }
    return out;
  }, [
    activePatientFactor,
    avgPharmacyBasket,
    avgServicePrice,
    contracts,
    patients.length,
    pharmacy.length,
    selectedMonth,
    selectedYear,
  ]);

  const monthlySeries = useMemo(() => {
    return MONTH_UZ.map((label, idx) => {
      const month = idx + 1;
      let contractExpense = 0;
      for (let d = 1; d <= daysInMonth(selectedYear, idx); d += 1) {
        contractExpense += expenseForCalendarDay(
          selectedYear,
          idx,
          d,
          contracts,
        );
      }
      const v = mix01(selectedYear, month);
      const visitsMonth = Math.round(
        activePatientFactor * 22 * (0.85 + 0.35 * v),
      );
      const patientPayments = Math.round(
        visitsMonth *
          avgServicePrice *
          (0.88 + 0.22 * mix01(selectedYear, month, 2)),
      );
      const pharmacySales = Math.round(
        visitsMonth *
          avgPharmacyBasket *
          0.41 *
          (0.62 + 0.38 * mix01(selectedYear, month, 3)),
      );
      const operational = Math.round(
        (55_000 + patients.length * 420 + pharmacy.length * 180) *
          daysInMonth(selectedYear, idx),
      );
      const expenses = Math.round(
        contractExpense +
          operational * (0.82 + 0.2 * mix01(selectedYear, month, 5)),
      );
      const revenue = patientPayments + pharmacySales;
      return { label, patientPayments, pharmacySales, expenses, revenue };
    });
  }, [
    activePatientFactor,
    avgPharmacyBasket,
    avgServicePrice,
    contracts,
    patients.length,
    pharmacy.length,
    selectedYear,
  ]);

  const halfYearSeries = useMemo(() => {
    const h1 = monthlySeries.slice(0, 6);
    const h2 = monthlySeries.slice(6);
    const sumKey = (arr: MoneyPoint[], key: keyof MoneyPoint) =>
      arr.reduce(
        (s, p) => s + (typeof p[key] === 'number' ? (p[key] as number) : 0),
        0,
      );
    return [
      {
        label: '1-yarim yil',
        patientPayments: sumKey(h1, 'patientPayments'),
        pharmacySales: sumKey(h1, 'pharmacySales'),
        expenses: sumKey(h1, 'expenses'),
        revenue: sumKey(h1, 'revenue'),
      },
      {
        label: '2-yarim yil',
        patientPayments: sumKey(h2, 'patientPayments'),
        pharmacySales: sumKey(h2, 'pharmacySales'),
        expenses: sumKey(h2, 'expenses'),
        revenue: sumKey(h2, 'revenue'),
      },
    ];
  }, [monthlySeries]);

  const yearlySeries = useMemo(() => {
    return years
      .slice()
      .reverse()
      .map((year) => {
        const months = MONTH_UZ.map((label, idx) => {
          let contractExpense = 0;
          for (let d = 1; d <= daysInMonth(year, idx); d += 1) {
            contractExpense += expenseForCalendarDay(year, idx, d, contracts);
          }
          const month = idx + 1;
          const v = mix01(year, month);
          const visitsMonth = Math.round(
            activePatientFactor * 22 * (0.85 + 0.35 * v),
          );
          const patientPayments = Math.round(
            visitsMonth *
              avgServicePrice *
              (0.88 + 0.22 * mix01(year, month, 2)),
          );
          const pharmacySales = Math.round(
            visitsMonth *
              avgPharmacyBasket *
              0.41 *
              (0.62 + 0.38 * mix01(year, month, 3)),
          );
          const operational = Math.round(
            (55_000 + patients.length * 420 + pharmacy.length * 180) *
              daysInMonth(year, idx),
          );
          const expenses = Math.round(
            contractExpense +
              operational * (0.82 + 0.2 * mix01(year, month, 5)),
          );
          const revenue = patientPayments + pharmacySales;
          return { patientPayments, pharmacySales, expenses, revenue };
        });
        type MoneyMetric = keyof Pick<
          MoneyPoint,
          'patientPayments' | 'pharmacySales' | 'expenses' | 'revenue'
        >;
        const fold = (key: MoneyMetric) =>
          months.reduce((s, m) => s + m[key], 0);
        return {
          label: String(year),
          patientPayments: fold('patientPayments'),
          pharmacySales: fold('pharmacySales'),
          expenses: fold('expenses'),
          revenue: fold('revenue'),
        };
      });
  }, [
    activePatientFactor,
    avgPharmacyBasket,
    avgServicePrice,
    contracts,
    patients.length,
    pharmacy.length,
    years,
  ]);

  const chartData = useMemo(() => {
    if (period === 'daily') return dailySeries;
    if (period === 'monthly') return monthlySeries;
    if (period === 'halfYear') return halfYearSeries;
    return yearlySeries;
  }, [dailySeries, halfYearSeries, monthlySeries, period, yearlySeries]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, p) => ({
        patientPayments: acc.patientPayments + p.patientPayments,
        pharmacySales: acc.pharmacySales + p.pharmacySales,
        expenses: acc.expenses + p.expenses,
        revenue: acc.revenue + p.revenue,
      }),
      { patientPayments: 0, pharmacySales: 0, expenses: 0, revenue: 0 },
    );
  }, [chartData]);

  const net = totals.revenue - totals.expenses;

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['Moliyaviy hisobot', String(period)],
      ['Yil', selectedYear],
      ['Oy', period === 'daily' ? selectedMonth : '—'],
      ['Bemorlar (bazaviy ro‘yxat)', patients.length],
      ['Farmatsiya pozitsiyalari', pharmacy.length],
      ['Xizmat narxlari (o‘rtacha)', Math.round(avgServicePrice)],
      [],
      [
        'Nuqta',
        'Bemor to‘lovlari',
        'Dori savdosi',
        'Xarajatlar',
        'Jami tushum',
      ],
      ...chartData.map((c) => [
        c.label,
        c.patientPayments,
        c.pharmacySales,
        c.expenses,
        c.revenue,
      ]),
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
    <div className="space-y-6 mt-3">
      <section className="relative overflow-hidden rounded-3xl border border-violet-200/60 bg-linear-to-br from-white via-violet-50/40 to-cyan-50/50 p-6 shadow-xl shadow-violet-200/40 backdrop-blur">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-violet-400/15 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-cyan-400/15 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600/90">
              Moliyaviy analitika
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Klinika hisobotlari
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Bemorlar to&apos;lovlari (xizmatlar narxi katalogi), farmatsiya
              savdosi (dorilar katalogi), xarajatlar (shartnomalar + operatsion)
              va jami tushumlar — barchasi mavjud modullar ma&apos;lumotlariga
              bog&apos;langan namunaviy dinamika.
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
                onClick={exportCsv}>
                <Download className="size-4" />
                CSV
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur transition hover:border-violet-200/80 hover:shadow-violet-200/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Bemor to&apos;lovlari
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {totals.patientPayments.toLocaleString('uz-UZ')}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-600">
                <CreditCard className="size-3.5" />
                Xizmatlar narxi asosida
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 ring-1 ring-violet-200/60">
              <Wallet className="size-5" />
            </span>
          </div>
        </article>

        <article className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur transition hover:border-emerald-200/80 hover:shadow-emerald-200/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Dori savdosi</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {totals.pharmacySales.toLocaleString('uz-UZ')}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Pill className="size-3.5" />
                Farmatsiya katalogi
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/60">
              <Pill className="size-5" />
            </span>
          </div>
        </article>

        <article className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur transition hover:border-amber-200/80 hover:shadow-amber-200/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Xarajatlar</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {totals.expenses.toLocaleString('uz-UZ')}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                <TrendingDown className="size-3.5" />
                Shartnomalar + operatsion
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-amber-200/60">
              <Activity className="size-5" />
            </span>
          </div>
        </article>

        <article className="group relative overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-5 shadow-lg shadow-slate-200/50 backdrop-blur transition hover:border-cyan-200/80 hover:shadow-cyan-200/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">Jami tushum</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                {totals.revenue.toLocaleString('uz-UZ')}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-cyan-700">
                <TrendingUp className="size-3.5" />
                Sof: {net.toLocaleString('uz-UZ')}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800 ring-1 ring-cyan-200/60">
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
          <p className="text-xs text-slate-500">So&apos;m · vizualizatsiya</p>
        </div>
        <div className="h-[min(420px,70vw)] w-full min-h-70">
          <ResponsiveContainer width="100%" height="100%">
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
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                formatter={(value) =>
                  value == null ? ''
                  : typeof value === 'number' ? value.toLocaleString('uz-UZ')
                  : String(value)
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="patientPayments"
                name="Bemor to'lovlari"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#repPay)"
              />
              <Area
                type="monotone"
                dataKey="pharmacySales"
                name="Dori savdosi"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={0.08}
                fill="#10b981"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Xarajatlar"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="#fbbf24"
                fillOpacity={0.06}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Jami tushum"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fill="url(#repRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <h4 className="mb-4 text-sm font-semibold text-slate-800">
            Tushum tuzilmasi (tanlangan davr)
          </h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    name: 'Xizmat',
                    sum: totals.patientPayments,
                  },
                  { name: 'Farmatsiya', sum: totals.pharmacySales },
                ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(value) =>
                    value == null ? ''
                    : typeof value === 'number' ? value.toLocaleString('uz-UZ')
                    : String(value)
                  }
                />
                <Bar
                  dataKey="sum"
                  name="So'm"
                  fill="#8b5cf6"
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <h4 className="mb-3 text-sm font-semibold text-slate-800">
            Manbalar
          </h4>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-2 rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5">
              <Wallet className="mt-0.5 size-4 shrink-0 text-violet-600" />
              <span>
                <span className="font-medium text-slate-800">
                  Bemorlar va navbat:
                </span>{' '}
                ro&apos;yxatdagi bemorlar soni aktiv tashrif stavkasini
                belgilaydi; xizmat narxlari{' '}
                <span className="font-medium text-violet-700">Services</span>{' '}
                katalogidagi o&apos;rtacha narxga bog&apos;langan.
              </span>
            </li>
            <li className="flex gap-2 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
              <Pill className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <span>
                <span className="font-medium text-slate-800">Dori-darmon:</span>{' '}
                <span className="font-medium text-emerald-700">
                  Mahsulotlar
                </span>{' '}
                modulidagi pozitsiyalar soni va qadoqlash parametrlari
                bo&apos;yicha baholangan savdo portfeli.
              </span>
            </li>
            <li className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2.5">
              <TrendingDown className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <span>
                <span className="font-medium text-slate-800">Xarajatlar:</span>{' '}
                <span className="font-medium text-amber-800">Shartnomalar</span>{' '}
                summalari sanalar oralig&apos;ida kunma-kun taqsimlangan;
                qo&apos;shimcha operatsion xarajatlar katalog hajmiga
                bog&apos;langan.
              </span>
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
