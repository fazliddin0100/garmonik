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
import { CalendarRange, ClipboardList, Download, FlaskConical, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type PeriodId = 'today' | 'month' | 'year';

type ReportPayload = {
  period: { id: PeriodId; label: string };
  staff: { login: string; fullName: string };
  summary: {
    testsInPeriod: number;
    patientsInPeriod: number;
    testsToday: number;
    testsAllTime: number;
  };
  byTestType: { label: string; count: number }[];
  items: {
    id: string;
    patientId: string;
    patientName: string;
    cardNumber: string;
    testLabel: string;
    categoryTitle?: string;
    resultValue: string;
    enteredAt: string;
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

export default function LaboratoryReportsPanel() {
  const [period, setPeriod] = useState<PeriodId>('month');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
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
    void fetch(`/api/laboratory/reports?${params}`, {
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
        label: 'Bajarilgan tahlillar',
        hint: data.period.label,
        value: s.testsInPeriod,
        icon: FlaskConical,
        tone: 'text-cyan-700 bg-cyan-100',
      },
      {
        label: 'Bemorlar',
        hint: data.period.label,
        value: s.patientsInPeriod,
        icon: Users,
        tone: 'text-violet-700 bg-violet-100',
      },
      {
        label: 'Bugun',
        hint: 'Joriy kun',
        value: s.testsToday,
        icon: CalendarRange,
        tone: 'text-emerald-700 bg-emerald-100',
      },
      {
        label: 'Jami (barcha vaqt)',
        hint: 'Siz kiritgan natijalar',
        value: s.testsAllTime,
        icon: ClipboardList,
        tone: 'text-slate-700 bg-slate-100',
      },
    ];
  }, [data]);

  function exportCsv() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ['Laboratoriya ishlari hisoboti', data.period.label],
      ['Xodim', data.staff.fullName],
      [],
      ['Ko‘rsatkich', 'Qiymat'],
      ['Bajarilgan tahlillar', data.summary.testsInPeriod],
      ['Bemorlar', data.summary.patientsInPeriod],
      ['Bugun', data.summary.testsToday],
      ['Jami (barcha vaqt)', data.summary.testsAllTime],
      [],
      ['Tahlil turi', 'Soni'],
      ...data.byTestType.map((x) => [x.label, x.count]),
      [],
      ['Vaqt', 'Bemor', 'Karta', 'Tahlil', 'Natija'],
      ...data.items.map((item) => [
        formatUzDateTime(item.enteredAt),
        item.patientName,
        item.cardNumber,
        item.testLabel,
        item.resultValue,
      ]),
    ];
    downloadCsv(`laboratoriya-hisobot-${data.period.id}.csv`, rows);
  }

  return (
    <div className="mt-3 space-y-5">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
              <FlaskConical className="size-3.5" />
              Laboratoriya ishlari
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-800">
              Bajarilgan tahlillar hisoboti
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Siz kiritgan laboratoriya natijalari bo‘yicha qisqa hisobot. Moliyaviy ma’lumotlar
              kiritilmagan.
              {data?.staff.fullName ?
                <>
                  {' '}
                  Xodim:{' '}
                  <span className="font-medium text-slate-700">{data.staff.fullName}</span>
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
                  'bg-cyan-600 text-white hover:bg-cyan-700'
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

        {error ?
          <p className="mt-4 text-sm text-rose-600">{error}</p>
        : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className={`mb-2 inline-flex rounded-lg p-2 ${card.tone}`}>
                <card.icon className="size-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm font-medium text-slate-700">{card.label}</p>
              <p className="text-xs text-slate-500">{card.hint}</p>
            </div>
          ))}
        </div>
      </section>

      {data && data.byTestType.length > 0 ?
        <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg sm:p-6">
          <h3 className="mb-3 font-semibold text-slate-800">Tahlil turlari bo‘yicha</h3>
          <div className="flex flex-wrap gap-2">
            {data.byTestType.map((row) => (
              <span
                key={row.label}
                className="rounded-full bg-cyan-50 px-3 py-1 text-sm text-cyan-900 ring-1 ring-cyan-200">
                {row.label}: <strong>{row.count}</strong>
              </span>
            ))}
          </div>
        </section>
      : null}

      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg sm:p-6">
        <h3 className="mb-3 font-semibold text-slate-800">
          Bajarilgan ishlar ro‘yxati
          {data ?
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({data.period.label}, oxirgi {data.items.length} ta)
            </span>
          : null}
        </h3>

        {loading ?
          <p className="text-sm text-slate-500">Yuklanmoqda…</p>
        : !data || data.items.length === 0 ?
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Tanlangan davrda siz kiritgan tahlil natijalari topilmadi.
          </p>
        : <div className="overflow-x-auto rounded-xl border border-slate-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Vaqt</TableHead>
                  <TableHead>Bemor</TableHead>
                  <TableHead>Tahlil</TableHead>
                  <TableHead>Natija</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">
                      {formatUzDateTime(item.enteredAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-slate-900">{item.patientName}</p>
                      <p className="text-xs text-slate-500">{item.cardNumber}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {item.testLabel}
                      {item.categoryTitle ?
                        <span className="block text-xs text-slate-500">{item.categoryTitle}</span>
                      : null}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-mono text-sm text-emerald-800">
                      {item.resultValue}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      </section>
    </div>
  );
}
