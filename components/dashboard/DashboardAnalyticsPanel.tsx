'use client';

import { Button } from '@/components/ui/button';
import { fetchClinicResource } from '@/lib/clinic-data/client';
import { normalizeDepartmentGroups } from '@/lib/clinic-departments/roles';
import { type DepartmentGroup } from '@/lib/clinic-departments/types';
import { type ClinicRoom } from '@/lib/clinic-rooms/types';
import { type ContractRow } from '@/lib/contracts/types';
import { type Partner } from '@/lib/partners/types';
import { type PharmacyProduct } from '@/lib/pharmacy/types';
import { type ServiceTypeRow } from '@/lib/service-types/types';
import { Download, TrendingUp } from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type MonthlyPoint = {
  month: string;
  revenue: number;
  contracts: number;
  occupancy: number;
  demand: number;
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

function asCsv(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    )
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

export default function DashboardAnalyticsPanel() {
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [pharmacy, setPharmacy] = useState<PharmacyProduct[]>([]);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const [
            nextRooms,
            nextDepartments,
            nextServiceTypes,
            nextPartners,
            nextContracts,
            nextPharmacy,
          ] = await Promise.all([
            fetchClinicResource<ClinicRoom[]>('rooms').catch(() => []),
            fetchClinicResource<unknown>('departments').catch(() => []),
            fetchClinicResource<ServiceTypeRow[]>('service-types').catch(() => []),
            fetchClinicResource<Partner[]>('partners').catch(() => []),
            fetchClinicResource<ContractRow[]>('contracts').catch(() => []),
            fetchClinicResource<PharmacyProduct[]>('pharmacy-products').catch(() => []),
          ]);
          startTransition(() => {
            if (cancelled) return;
            setRooms(Array.isArray(nextRooms) ? nextRooms : []);
            setDepartments(normalizeDepartmentGroups(nextDepartments));
            setServiceTypes(Array.isArray(nextServiceTypes) ? nextServiceTypes : []);
            setPartners(Array.isArray(nextPartners) ? nextPartners : []);
            setContracts(Array.isArray(nextContracts) ? nextContracts : []);
            setPharmacy(Array.isArray(nextPharmacy) ? nextPharmacy : []);
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

  const years = useMemo(() => {
    const fromContracts = contracts
      .map((c) => parseUzDate(c.date)?.getFullYear() ?? null)
      .filter((y): y is number => y !== null);
    const now = new Date().getFullYear();
    return [...new Set([now, now - 1, ...fromContracts])].sort((a, b) => b - a);
  }, [contracts]);

  /** `years` yangilanganda yoki tanlov mos kelmasa — effect siz, bitta renderda hisoblanadi */
  const resolvedYear = useMemo(() => {
    const fallback = years[0] ?? new Date().getFullYear();
    return years.includes(selectedYear) ? selectedYear : fallback;
  }, [years, selectedYear]);

  const monthly = useMemo<MonthlyPoint[]>(() => {
    const monthLabels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const roomCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
    const roomOccupied = rooms.reduce((s, r) => s + r.occupied, 0);
    const baseDemand = serviceTypes.length;
    const occupancyPct = roomCapacity > 0 ? Math.round((roomOccupied / roomCapacity) * 100) : 0;

    return monthLabels.map((label, idx) => {
      const month = idx + 1;
      const monthContracts = contracts.filter((c) => {
        const dt = parseUzDate(c.date);
        return dt && dt.getFullYear() === resolvedYear && dt.getMonth() + 1 === month;
      });
      const revenue = monthContracts.reduce((s, c) => s + moneyFromText(c.amount), 0);
      const contractsCount = monthContracts.length;

      // Marketing uchun trend: mavjud ma'lumotlardan hisoblangan talab indeksi
      const season = 0.85 + ((idx % 6) * 0.07);
      const demand = Math.round(baseDemand * season + partners.length * 0.6);

      return {
        month: label,
        revenue,
        contracts: contractsCount,
        occupancy: occupancyPct,
        demand,
      };
    });
  }, [
    contracts,
    partners.length,
    resolvedYear,
    rooms,
    serviceTypes.length,
  ]);

  const halfYear = useMemo(() => {
    const h1 = monthly.slice(0, 6);
    const h2 = monthly.slice(6);
    const sum = (arr: MonthlyPoint[], key: keyof MonthlyPoint) =>
      arr.reduce((s, p) => s + (typeof p[key] === 'number' ? (p[key] as number) : 0), 0);
    return [
      { period: '1-yarim yil', revenue: sum(h1, 'revenue'), demand: sum(h1, 'demand') },
      { period: '2-yarim yil', revenue: sum(h2, 'revenue'), demand: sum(h2, 'demand') },
    ];
  }, [monthly]);

  const yearlySeries = useMemo(() => {
    return years
      .slice()
      .reverse()
      .map((year) => {
        const c = contracts.filter((x) => parseUzDate(x.date)?.getFullYear() === year);
        const revenue = c.reduce((s, x) => s + moneyFromText(x.amount), 0);
        const contractsCount = c.length;
        const demand = Math.round(
          serviceTypes.length * (0.9 + (year % 5) * 0.08),
        );
        return { year: String(year), revenue, contracts: contractsCount, demand };
      });
  }, [contracts, serviceTypes.length, years]);

  const occupancyPie = useMemo(() => {
    const capacity = rooms.reduce((s, r) => s + r.capacity, 0);
    const occupied = rooms.reduce((s, r) => s + r.occupied, 0);
    const free = Math.max(0, capacity - occupied);
    return [
      { name: 'Band o‘rin', value: occupied },
      { name: 'Bo‘sh o‘rin', value: free },
    ];
  }, [rooms]);

  const selectedYearSummary = useMemo(() => {
    const revenue = monthly.reduce((s, m) => s + m.revenue, 0);
    const contractsCount = monthly.reduce((s, m) => s + m.contracts, 0);
    const demand = monthly.reduce((s, m) => s + m.demand, 0);
    return { revenue, contractsCount, demand };
  }, [monthly]);

  function exportYearReport(year: number) {
    const monthlyYear =
      year === resolvedYear ?
        monthly
      : (() => {
          const monthLabels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
          return monthLabels.map((label, idx) => {
            const month = idx + 1;
            const monthContracts = contracts.filter((c) => {
              const dt = parseUzDate(c.date);
              return dt && dt.getFullYear() === year && dt.getMonth() + 1 === month;
            });
            const revenue = monthContracts.reduce((s, c) => s + moneyFromText(c.amount), 0);
            const contractsCount = monthContracts.length;
            const season = 0.85 + ((idx % 6) * 0.07);
            const demand = Math.round(
              serviceTypes.length * season + partners.length * 0.6,
            );
            return { month: label, revenue, contracts: contractsCount, occupancy: 0, demand };
          });
        })();

    const rows: (string | number)[][] = [
      ['Dashboard hisobot', `Yil: ${year}`],
      ['Ko‘rsatkich', 'Qiymat'],
      ['Xonalar soni', rooms.length],
      ['Bo‘limlar soni', departments.length],
      ['Xizmat turlari soni', serviceTypes.length],
      ['Hamkorlar', partners.length],
      ['Shartnomalar', contracts.length],
      ['Farmasiya pozitsiyalari', pharmacy.length],
      [],
      ['Oylik dinamika'],
      ['Oy', 'Daromad', 'Shartnoma soni', 'Talab indeksi'],
      ...monthlyYear.map((m) => [m.month, m.revenue, m.contracts, m.demand]),
      [],
      ['Shartnomalar (raw)'],
      ['ID', 'Hisob raqam', 'Yetkazib beruvchi', 'Sana', 'Tugash sanasi', 'Summa'],
      ...contracts.map((c) => [c.id, c.accountNumber, c.supplierName, c.date, c.endDate, c.amount]),
    ];

    downloadCsv(`dashboard-report-${year}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-violet-500">Boshqaruv paneli</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-800">
              Marketing va hisobot analitikasi
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Oylik, yarim yillik va yillik kesimda dinamik ko‘rsatkichlar. Dashboard
              ma&apos;lumotlarini yil bo‘yicha CSV (Excel) formatda yuklab olish mumkin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Hisobot yili"
              title="Hisobot yili"
              value={resolvedYear}
              onChange={(e) => setSelectedYear(Number.parseInt(e.target.value, 10))}
              className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-sm text-slate-700 outline-none ring-violet-300 focus:ring-2">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} yil
                </option>
              ))}
            </select>
            <Button
              type="button"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => exportYearReport(resolvedYear)}>
              <Download className="size-4" />
              Excel (CSV) yuklab olish
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <article className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur">
          <p className="text-sm text-slate-500">{resolvedYear} daromad</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {selectedYearSummary.revenue.toLocaleString('ru-RU')}
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-600">yillik shartnomalar summasi</p>
        </article>
        <article className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur">
          <p className="text-sm text-slate-500">{resolvedYear} shartnomalar</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{selectedYearSummary.contractsCount}</p>
          <p className="mt-2 text-xs font-semibold text-violet-600">oylik kesim asosida</p>
        </article>
        <article className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur">
          <p className="text-sm text-slate-500">Talab indeksi</p>
          <p className="mt-2 text-3xl font-bold text-slate-800">{selectedYearSummary.demand}</p>
          <p className="mt-2 text-xs font-semibold text-cyan-600">xizmatlar + hamkorlar asosida</p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <TrendingUp className="size-4 text-violet-600" />
            <h3 className="font-semibold">Oylik dinamika ({resolvedYear})</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Daromad"
                  stroke="#7C3AED"
                  fill="url(#revGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="demand"
                  name="Talab indeksi"
                  stroke="#0EA5E9"
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <h3 className="mb-4 font-semibold text-slate-700">Yarim yillik hisobot</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={halfYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="Daromad" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="demand" name="Talab" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <h3 className="mb-4 font-semibold text-slate-700">Yillik kesim</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" name="Daromad" fill="#2563EB" radius={[6, 6, 0, 0]} />
                <Bar dataKey="contracts" name="Shartnomalar soni" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
          <h3 className="mb-4 font-semibold text-slate-700">Xonalar bandligi</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyPie}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  fill="#8B5CF6"
                  label
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Yillik hisobotlar</h4>
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Button
              key={y}
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => exportYearReport(y)}>
              <Download className="size-4" />
              {y} yilni Excel (CSV) olish
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
