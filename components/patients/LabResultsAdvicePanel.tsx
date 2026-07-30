'use client';

import type { LabInterpretationSummary, LabResultInterpretation } from '@/lib/laboratory/interpret-results';
import type { CompareStatus } from '@/lib/laboratory/parse-lab-value';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const STATUS_LABEL: Record<CompareStatus, string> = {
  normal: 'Me\'yorda',
  high: 'Yuqori',
  low: 'Past',
  abnormal: 'Kutilmagan',
  unknown: 'Baholanmadi',
};

const STATUS_CLASS: Record<CompareStatus, string> = {
  normal: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  high: 'bg-rose-100 text-rose-800 border-rose-200',
  low: 'bg-amber-100 text-amber-900 border-amber-200',
  abnormal: 'bg-orange-100 text-orange-900 border-orange-200',
  unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

function StatusIcon({ status }: { status: CompareStatus }) {
  if (status === 'normal') return <CheckCircle2 className="size-4 shrink-0" />;
  if (status === 'high') return <TrendingUp className="size-4 shrink-0" />;
  if (status === 'low') return <TrendingDown className="size-4 shrink-0" />;
  if (status === 'abnormal') return <AlertTriangle className="size-4 shrink-0" />;
  return <HelpCircle className="size-4 shrink-0" />;
}

function InterpretationRow({ item }: { item: LabResultInterpretation }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{item.label}</p>
          {item.categoryTitle ?
            <p className="text-xs text-slate-500">{item.categoryTitle}</p>
          : null}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[item.status]}`}>
          <StatusIcon status={item.status} />
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>
          <span className="text-slate-500">Natija: </span>
          <span className="font-semibold text-slate-900">
            {item.value}
            {item.unit ? ` ${item.unit}` : ''}
          </span>
        </span>
        <span>
          <span className="text-slate-500">Me&apos;yor: </span>
          <span className="text-slate-700">{item.norm}</span>
        </span>
        {item.deviation ?
          <span className="text-xs font-medium text-rose-700">{item.deviation}</span>
        : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.advice}</p>
    </div>
  );
}

type LabResultsAdvicePanelProps = {
  summary: LabInterpretationSummary;
  /** Faqat ogohlantirishlar va maslahatlar (qisqa ko‘rinish) */
  compact?: boolean;
  /** Shifokor kabinetida yuqori tavsiya bloki */
  variant?: 'default' | 'doctor';
};

export default function LabResultsAdvicePanel({
  summary,
  compact = false,
  variant = 'default',
}: LabResultsAdvicePanelProps) {
  if (summary.items.length === 0) return null;

  const isDoctor = variant === 'doctor';
  const bannerClass =
    summary.abnormalCount > 0 ?
      'border-amber-200 bg-linear-to-br from-amber-50 to-orange-50 text-amber-950'
    : 'border-emerald-200 bg-linear-to-br from-emerald-50 to-teal-50 text-emerald-950';

  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        isDoctor ?
          'border-violet-300/80 bg-linear-to-br from-violet-50/90 via-white to-indigo-50/40 ring-1 ring-violet-200/60'
        : 'border-indigo-200/70 bg-white'
      }`}>
      <div className={`mb-4 flex items-center gap-2 ${isDoctor ? 'text-violet-900' : 'text-indigo-900'}`}>
        <Stethoscope className="size-5" />
        <div>
          <h3 className="font-semibold">
            {isDoctor ? 'Shifokorga tavsiya' : 'Tahlil natijalari tahlili va maslahat'}
          </h3>
          {isDoctor ?
            <p className="text-xs font-normal text-violet-700/90">
              Tahlil natijalari tahlili va maslahat
            </p>
          : null}
        </div>
      </div>

      <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${bannerClass}`}>
        <p className="font-medium">{summary.overview}</p>
        {summary.clinicalHints.length > 0 ?
          <ul className="mt-2 space-y-1.5">
            {summary.clinicalHints.map((hint) => (
              <li key={hint} className="flex gap-2 leading-relaxed">
                <Lightbulb className="mt-0.5 size-4 shrink-0 opacity-80" />
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        : null}
      </div>

      {!compact && summary.abnormalItems.length > 0 ?
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Me&apos;yordan chetga chiqqan ko‘rsatkichlar
          </p>
          {summary.abnormalItems.map((item) => (
            <InterpretationRow key={item.orderKey} item={item} />
          ))}
        </div>
      : null}

      {!compact && summary.normalCount > 0 ?
        <details className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-emerald-900">
            Me&apos;yorda ({summary.normalCount} ta)
          </summary>
          <div className="mt-3 space-y-2">
            {summary.items
              .filter((i) => i.status === 'normal')
              .map((item) => (
                <InterpretationRow key={item.orderKey} item={item} />
              ))}
          </div>
        </details>
      : null}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">{summary.disclaimer}</p>
    </section>
  );
}

export function LabResultStatusBadge({ status }: { status: CompareStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
