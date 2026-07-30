'use client';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarRange,
  ClipboardList,
  Download,
  UserPlus,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type PeriodId = 'today' | 'month' | 'year';

type ReportPayload = {
  period: { id: PeriodId; label: string };
  operator: { fullName: string };
  summary: {
    registeredInPeriod: number;
    queuedInPeriod: number;
    registeredToday: number;
    totalAllTime: number;
    currentlyInQueueTotal: number;
    registeredPatientsInQueue: number;
    registeredByMeInPeriod?: number;
    registeredByMeAllTime?: number;
  };
  byDiseaseType: { label: string; count: number }[];
  byGender: { label: string; count: number }[];
  byDay: { label: string; count: number }[];
  recent: {
    id: string;
    cardNumber: string;
    fullName: string;
    diseaseType: string;
    gender: string;
    createdAt: string;
  }[];
};

function formatUzDateTime(iso: string) {
  return new Date(iso).toLocaleString('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

export default function KabinetReportsPanel() {
  const [period, setPeriod] = useState<PeriodId>('month');
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ period });
    if (period === 'month') {
      params.set('year', String(selectedYear));
      params.set('month', String(selectedMonth));
    } else if (period === 'year') {
      params.set('year', String(selectedYear));
    }

    setLoading(true);
    setError('');
    void fetch(`/api/kabinet/reports?${params}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        const json = (await res.json()) as ReportPayload & { error?: string };
        if (!res.ok) throw new Error(json.error || 'Hisobot yuklanmadi');
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) {
          setData(null);
          setError(e instanceof Error ? e.message : 'Hisobot yuklanmadi');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, selectedYear, selectedMonth]);

  const statCards = useMemo(() => {
    if (!data) return [];
    const s = data.summary;
    return [
      {
        label: 'Ro‘yxatga olingan',
        hint: data.period.label,
        value: s.registeredInPeriod,
        icon: UserPlus,
        tone: 'text-sky-700 bg-sky-100',
      },
      {
        label: 'Navbatga qo‘shilgan',
        hint: data.period.label,
        value: s.queuedInPeriod,
        icon: ClipboardList,
        tone: 'text-violet-700 bg-violet-100',
      },
      {
        label: 'Bugun ro‘yxatga olingan',
        hint: 'Joriy kun',
        value: s.registeredToday,
        icon: CalendarRange,
        tone: 'text-emerald-700 bg-emerald-100',
      },
      {
        label: 'Jami (barcha vaqt)',
        hint: 'Klinikada ro‘yxatga olingan bemorlar',
        value: s.totalAllTime,
        icon: Users,
        tone: 'text-slate-700 bg-slate-100',
      },
    ];
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ['Kabinet hisoboti', data.period.label],
      ['Xodim', data.operator.fullName],
      [],
      ['Ko‘rsatkich', 'Qiymat'],
      ['Ro‘yxatga olingan', data.summary.registeredInPeriod],
      ['Navbatga qo‘shilgan', data.summary.queuedInPeriod],
      ['Bugun ro‘yxatga olingan', data.summary.registeredToday],
      ['Jami', data.summary.totalAllTime],
      ['Hozir navbatda (klinika)', data.summary.currentlyInQueueTotal],
      ['Navbatda (ro‘yxatdagi bemorlar)', data.summary.registeredPatientsInQueue],
      ['Siz ro‘yxatga olgan (davr)', data.summary.registeredByMeInPeriod ?? 0],
      ['Siz ro‘yxatga olgan (jami)', data.summary.registeredByMeAllTime ?? 0],
      [],
      ['Kasallik turi', 'Soni'],
      ...data.byDiseaseType.map((x) => [x.label, x.count]),
      [],
      ['Jins', 'Soni'],
      ...data.byGender.map((x) => [x.label, x.count]),
      [],
      ['Karta', 'F.I.SH', 'Kasallik', 'Jins', 'Vaqt'],
      ...data.recent.map((r) => [
        r.cardNumber,
        r.fullName,
        r.diseaseType,
        r.gender,
        formatUzDateTime(r.createdAt),
      ]),
    ];
    downloadCsv(`kabinet-hisobot-${data.period.id}.csv`, rows);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              <ClipboardList className="size-3.5" />
              Kabinet hisoboti
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-800">
              Qabul va ro‘yxatga olish
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Klinikada ro‘yxatga olingan bemorlar, navbat va kasallik turi
              bo‘yicha statistika (ma’lumotlar bazasidan).
              {data?.operator.fullName ?
                <>
                  {' '}
                  Xodim:{' '}
                  <span className="font-medium text-slate-700">
                    {data.operator.fullName}
                  </span>
                </>
              : null}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={exportCsv}
            disabled={!data || loading}>
            <Download className="size-3.5" />
            CSV yuklab olish
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'today' as const, label: 'Bugun' },
              { id: 'month' as const, label: 'Oy' },
              { id: 'year' as const, label: 'Yil' },
            ] as const
          ).map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={period === item.id ? 'default' : 'outline'}
              className={
                period === item.id ?
                  'bg-sky-600 text-white hover:bg-sky-700'
                : ''
              }
              onClick={() => setPeriod(item.id)}>
              {item.label}
            </Button>
          ))}
          {period === 'month' ?
            <>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}-oy
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}>
                {[selectedYear - 1, selectedYear, selectedYear + 1].map(
                  (y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ),
                )}
              </select>
            </>
          : null}
          {period === 'year' ?
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          : null}
        </div>

        {error ?
          <p className="mt-4 text-sm text-red-600">{error}</p>
        : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-white/90 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">{card.hint}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {card.label}
                  </p>
                </div>
                <span className={`inline-flex rounded-xl p-2 ${card.tone}`}>
                  <card.icon className="size-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? '…' : card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
            <p className="text-xs text-slate-500">Hozir navbatda (klinika)</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? '…' : (data?.summary.currentlyInQueueTotal ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
            <p className="text-xs text-slate-500">
              Navbatda (bazadagi bemorlar)
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loading ? '…' : (data?.summary.registeredPatientsInQueue ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {data && data.byDay.length > 0 ?
        <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6">
          <h3 className="text-sm font-semibold text-slate-800">
            {period === 'year' ? 'Oylik dinamika' : 'Kunlik dinamika'} —{' '}
            {data.period.label}
          </h3>
          <div className="mt-4 h-64 w-full min-h-64 min-w-0">
            <ResponsiveContainer width="100%" height={256} minWidth={0}>
              <BarChart data={data.byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="Ro‘yxatga olingan"
                  fill="#0284c7"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6">
          <h3 className="text-sm font-semibold text-slate-800">
            Kasallik turi bo‘yicha
          </h3>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kasallik turi</TableHead>
                  <TableHead className="text-right">Soni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.byDiseaseType.length ?
                  data.byDiseaseType.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.count}
                      </TableCell>
                    </TableRow>
                  ))
                : <TableRow>
                    <TableCell colSpan={2} className="text-slate-500">
                      {loading ? 'Yuklanmoqda…' : 'Ma’lumot yo‘q'}
                    </TableCell>
                  </TableRow>
                }
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6">
          <h3 className="text-sm font-semibold text-slate-800">
            Jins bo‘yicha
          </h3>
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jins</TableHead>
                  <TableHead className="text-right">Soni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.byGender.length ?
                  data.byGender.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.count}
                      </TableCell>
                    </TableRow>
                  ))
                : <TableRow>
                    <TableCell colSpan={2} className="text-slate-500">
                      {loading ? 'Yuklanmoqda…' : 'Ma’lumot yo‘q'}
                    </TableCell>
                  </TableRow>
                }
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6">
        <h3 className="text-sm font-semibold text-slate-800">
          So‘nggi ro‘yxatga olishlar — {data?.period.label ?? ''}
        </h3>
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karta</TableHead>
                <TableHead>F.I.SH</TableHead>
                <TableHead>Kasallik</TableHead>
                <TableHead>Jins</TableHead>
                <TableHead>Vaqt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.recent.length ?
                data.recent.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">
                      {row.cardNumber}
                    </TableCell>
                    <TableCell className="font-medium">{row.fullName}</TableCell>
                    <TableCell>{row.diseaseType}</TableCell>
                    <TableCell>{row.gender}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatUzDateTime(row.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              : <TableRow>
                  <TableCell colSpan={5} className="text-slate-500">
                    {loading ? 'Yuklanmoqda…' : 'Tanlangan davrda yozuv yo‘q'}
                  </TableCell>
                </TableRow>
              }
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
