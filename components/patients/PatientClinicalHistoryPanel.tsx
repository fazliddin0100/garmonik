'use client';

import { Button } from '@/components/ui/button';
import {
  CLINICAL_HISTORY_KIND_LABELS,
  formatHistoryDate,
  getPatientClinicalHistory,
  groupClinicalHistoryByDay,
  MEDICATION_CHANGE_LABELS,
  VITAL_SIGN_LABELS,
  type ClinicalHistoryEntry,
  type ClinicalHistoryKind,
} from '@/lib/patients/clinical-history';
import { formatPrescriptionDate } from '@/lib/patients/prescriptions';
import type { PatientRow } from '@/lib/patients/types';
import { resolveLabOrders } from '@/lib/patients/resolve-order-labels';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import { cn } from '@/lib/utils';
import {
  Activity,
  ClipboardList,
  FileText,
  FlaskConical,
  History,
  Pill,
  Stethoscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const KIND_ICONS: Record<ClinicalHistoryKind, LucideIcon> = {
  diagnosis: Stethoscope,
  lab_order: ClipboardList,
  lab_result: FlaskConical,
  lab_conclusion: FileText,
  prescription: Pill,
  vital_sign: Activity,
  medication_change: Pill,
  note: History,
};

type Props = {
  patient: PatientRow;
  labCatalog?: LabCategory[];
  priceRows?: ServicePriceRow[];
  compact?: boolean;
  maxItems?: number;
  /** Kun bo‘yicha filtrlash (karta oynasi va tarix moduli) */
  dailyFilter?: boolean;
};

function HistoryEntryBody({
  entry,
  labCatalog,
  priceRows,
}: {
  entry: ClinicalHistoryEntry;
  labCatalog: LabCategory[];
  priceRows: ServicePriceRow[];
}) {
  if (entry.kind === 'prescription' && entry.prescription) {
    const rx = entry.prescription;
    return (
      <div className="mt-2 space-y-1.5">
        {rx.note ? <p className="text-sm text-slate-600">{rx.note}</p> : null}
        <ul className="space-y-1">
          {rx.items.map((item) => (
            <li key={`${entry.id}-${item.productId}`} className="text-sm text-slate-800">
              <span className="font-medium">{item.productName}</span>
              {item.dosage ? ` — ${item.dosage}` : ''}
              {item.duration ? ` · ${item.duration}` : ''}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (entry.kind === 'lab_order' && (entry.orderedLaboratoryKeys?.length ?? 0) > 0) {
    const orders = resolveLabOrders(entry.orderedLaboratoryKeys ?? [], labCatalog, priceRows);
    return (
      <ul className="mt-2 space-y-1">
        {orders.slice(0, 12).map((o) => (
          <li key={`${entry.id}-${o.key}`} className="text-sm text-slate-700">
            {o.label}
          </li>
        ))}
        {orders.length > 12 ?
          <li className="text-xs text-slate-500">+{orders.length - 12} ta boshqa</li>
        : null}
      </ul>
    );
  }

  if (entry.kind === 'lab_result' && (entry.laboratoryResults?.length ?? 0) > 0) {
    const keys = entry.laboratoryResults!.map((r) => r.orderKey);
    const orders = resolveLabOrders(keys, labCatalog, priceRows);
    const labelByKey = new Map(orders.map((o) => [o.key, o.label]));
    return (
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {entry.laboratoryResults!.map((r) => (
          <li
            key={`${entry.id}-${r.orderKey}`}
            className="rounded-lg bg-white/80 px-2.5 py-1.5 text-sm text-slate-800">
            <span className="text-slate-500">{labelByKey.get(r.orderKey) ?? r.orderKey}: </span>
            <span className="font-medium">{r.value}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (entry.kind === 'vital_sign') {
    const label = entry.vitalType ? VITAL_SIGN_LABELS[entry.vitalType] : 'Ko‘rsatkich';
    return (
      <p className="mt-1 text-sm font-medium text-slate-800">
        {label}: {entry.vitalValue}
        {entry.vitalUnit ? ` ${entry.vitalUnit}` : ''}
      </p>
    );
  }

  if (entry.kind === 'medication_change') {
    return (
      <p className="mt-1 text-sm text-slate-800">
        <span className="font-medium">{entry.medicationName}</span>
        {entry.medicationChange ?
          ` — ${MEDICATION_CHANGE_LABELS[entry.medicationChange]}`
        : ''}
        {entry.medicationDosage ? ` · ${entry.medicationDosage}` : ''}
        {entry.text && entry.text !== entry.medicationName ?
          <span className="mt-1 block text-slate-600">{entry.text}</span>
        : null}
      </p>
    );
  }

  if (entry.text) {
    return <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{entry.text}</p>;
  }

  return null;
}

function HistoryEntryCard({
  entry,
  labCatalog,
  priceRows,
  showTime = true,
}: {
  entry: ClinicalHistoryEntry;
  labCatalog: LabCategory[];
  priceRows: ServicePriceRow[];
  showTime?: boolean;
}) {
  const Icon = KIND_ICONS[entry.kind];
  const timeLabel =
    entry.kind === 'prescription' && entry.prescription ?
      formatPrescriptionDate(entry.prescription.prescribedAt)
    : formatHistoryDate(entry.recordedAt);

  return (
    <li className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-slate-900">
              {CLINICAL_HISTORY_KIND_LABELS[entry.kind]}
            </p>
            {showTime ?
              <p className="text-xs text-slate-500">{timeLabel}</p>
            : null}
          </div>
          {entry.recordedByName ?
            <p className="text-xs text-slate-500">{entry.recordedByName}</p>
          : null}
          <HistoryEntryBody entry={entry} labCatalog={labCatalog} priceRows={priceRows} />
        </div>
      </div>
    </li>
  );
}

export default function PatientClinicalHistoryPanel({
  patient,
  labCatalog = [],
  priceRows = [],
  compact = false,
  maxItems,
  dailyFilter = true,
}: Props) {
  const history = getPatientClinicalHistory(patient);
  const dayGroups = useMemo(() => groupClinicalHistoryByDay(history), [history]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDayKey(dayGroups[0]?.dayKey ?? null);
  }, [patient.id, dayGroups]);

  const selectedGroup = useMemo(
    () => dayGroups.find((g) => g.dayKey === selectedDayKey) ?? dayGroups[0] ?? null,
    [dayGroups, selectedDayKey],
  );

  const visible = useMemo(() => {
    if (dailyFilter && selectedGroup) return selectedGroup.entries;
    const list = history;
    return maxItems ? list.slice(0, maxItems) : list;
  }, [dailyFilter, selectedGroup, history, maxItems]);

  if (history.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Tibbiy tarix hali kiritilmagan. Shifokor qabulida tashxis, tahlil va dorilar shu yerda
        to‘planadi.
      </p>
    );
  }

  if (compact) {
    const dayCount = dayGroups.length;
    return (
      <p className="text-xs font-medium text-violet-700">
        Tibbiy tarix: {history.length} yozuv · {dayCount} kun
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2 text-violet-900">
        <History className="size-4" />
        <p className="text-sm font-semibold">
          Tibbiy tarix ({history.length} yozuv · {dayGroups.length} kun)
        </p>
      </div>

      {dailyFilter && dayGroups.length > 0 ?
        <div className="shrink-0 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Kun bo‘yicha ko‘rish
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dayGroups.map((group) => {
              const active = selectedDayKey === group.dayKey;
              return (
                <Button
                  key={group.dayKey}
                  type="button"
                  size="sm"
                  variant={active ? 'default' : 'outline'}
                  className={cn(
                    'shrink-0 rounded-lg px-3.5',
                    active ? 'bg-violet-600 hover:bg-violet-700' : 'border-slate-200',
                  )}
                  onClick={() => setSelectedDayKey(group.dayKey)}>
                  {group.label}
                  <span
                    className={cn(
                      'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      active ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-800',
                    )}>
                    {group.entries.length}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {dailyFilter && selectedGroup ?
          <p className="mb-3 text-xs text-slate-500">
            {selectedGroup.label} — {selectedGroup.entries.length} ta o‘zgarish
          </p>
        : null}
        <ul className="space-y-3">
          {visible.map((entry) => (
            <HistoryEntryCard
              key={entry.id}
              entry={entry}
              labCatalog={labCatalog}
              priceRows={priceRows}
              showTime={dailyFilter}
            />
          ))}
        </ul>
        {!dailyFilter && maxItems && history.length > maxItems ?
          <p className="mt-3 text-center text-xs text-slate-500">
            Yana {history.length - maxItems} ta yozuv
          </p>
        : null}
      </div>
    </div>
  );
}
