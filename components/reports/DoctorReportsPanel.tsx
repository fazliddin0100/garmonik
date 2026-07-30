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
  FlaskConical,
  Stethoscope,
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
  doctor: { id: string; fullName: string };
  summary: {
    patientsServedInPeriod: number;
    labOrdersInPeriod: number;
    servedToday: number;
    totalServedAllTime: number;
    totalLabOrdersAllTime: number;
  };
  byDiseaseType: { label: string; count: number }[];
  byDay: { label: string; count: number }[];
  recent: {
    id: string;
    cardNumber: string;
    fullName: string;
    diseaseType: string;
    gender: string;
    labOrderCount: number;
    hasDiagnosisNote: boolean;
    completedAt: string;
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

export default function DoctorReportsPanel() {
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
    void fetch(`/api/doctor/reports?${params}`, {
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
        label: 'Tibbiy xizmat ko‘rsatilgan bemorlar',
        hint: data.period.label,
        value: s.patientsServedInPeriod,
        icon: Stethoscope,
        tone: 'text-violet-700 bg-violet-100',
      },
      {
        label: 'Belgilangan tahlillar',
        hint: data.period.label,
        value: s.labOrdersInPeriod,
        icon: FlaskConical,
        tone: 'text-cyan-700 bg-cyan-100',
      },
      {
        label: 'Bugun qabul qilingan',
        hint: 'Joriy kun',
        value: s.servedToday,
        icon: CalendarRange,
        tone: 'text-emerald-700 bg-emerald-100',
      },
      {
        label: 'Jami (barcha vaqt)',
        hint: 'Siz ko‘rgan bemorlar',
        value: s.totalServedAllTime,
        icon: ClipboardList,
        tone: 'text-slate-700 bg-slate-100',
      },
    ];
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ['Shifokor hisoboti', data.period.label],
      ['Shifokor', data.doctor.fullName],
      [],
      ['Ko‘rsatkich', 'Qiymat'],
      ['Tibbiy xizmat — bemorlar', data.summary.patientsServedInPeriod],
      ['Tahlil buyurtmalari', data.summary.labOrdersInPeriod],
      ['Bugun qabul', data.summary.servedToday],
      ['Jami bemorlar (barcha vaqt)', data.summary.totalServedAllTime],
      ['Jami tahlil buyurtmalari', data.summary.totalLabOrdersAllTime],
      [],
      ['Kasallik turi', 'Soni'],
      ...data.byDiseaseType.map((x) => [x.label, x.count]),
      [],
      ['Karta', 'F.I.SH', 'Kasallik', 'Tahlillar', 'Tashxis', 'Vaqt'],
      ...data.recent.map((r) => [
        r.cardNumber,
        r.fullName,
        r.diseaseType,
        r.labOrderCount,
        r.hasDiagnosisNote ? 'Ha' : 'Yo‘q',
        formatUzDateTime(r.completedAt),
      ]),
    ];
    downloadCsv(`shifokor-hisobot-${data.period.id}.csv`, rows);
  }

  return (
    <div className="mt-3 space-y-5">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <Stethoscope className="size-3.5" />
              Shifokor hisoboti
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-800">
              Tibbiy xizmatlar statistikasi
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Faqat siz navbatda qabul qilib saqlagan bemorlar (tashxis yoki tahlil
              belgilangan). Har bir qabul alohida hisoblanadi.
              {data?.doctor.fullName ?
                <>
                  {' '}
                  Shifokor:{' '}
                  <span className="font-medium text-slate-700">
                    {data.doctor.fullName}
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
                  'bg-violet-600 text-white hover:bg-violet-700'
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
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
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
      </section>

      {error ?
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      : null}

      {loading ?
        <p className="text-sm text-slate-500">Hisobot yuklanmoqda…</p>
      : null}

      {!loading && data ?
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.label}
                  className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md backdrop-blur">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">{card.hint}</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {card.label}
                      </p>
                    </div>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p>
                </article>
              );
            })}
          </div>

          {data.byDay.length > 0 ?
            <section className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
              <h3 className="mb-4 font-semibold text-slate-800">
                Kunlar bo‘yicha qabul qilingan bemorlar
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          : null}

          <section className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-md">
            <h3 className="mb-3 font-semibold text-slate-800">
              So‘nggi qabullar ({data.period.label})
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Karta</TableHead>
                    <TableHead>F.I.SH</TableHead>
                    <TableHead>Kasallik</TableHead>
                    <TableHead className="text-center">Tahlillar</TableHead>
                    <TableHead className="text-center">Tashxis</TableHead>
                    <TableHead>Vaqt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.length === 0 ?
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                        Tanlangan davrda tibbiy xizmat ko‘rsatilgan bemor yo‘q.
                      </TableCell>
                    </TableRow>
                  : data.recent.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {r.cardNumber}
                        </TableCell>
                        <TableCell className="font-medium">{r.fullName}</TableCell>
                        <TableCell>{r.diseaseType}</TableCell>
                        <TableCell className="text-center">{r.labOrderCount}</TableCell>
                        <TableCell className="text-center">
                          {r.hasDiagnosisNote ? 'Ha' : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {formatUzDateTime(r.completedAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      : null}
    </div>
  );
}
