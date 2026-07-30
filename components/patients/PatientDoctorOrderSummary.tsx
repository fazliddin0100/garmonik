'use client';

import { resolvePostPaymentLineItems, sumPostPaymentTotal } from '@/lib/queue/post-payment-items';
import type { PatientRow } from '@/lib/patients/types';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import { ClipboardList, FlaskConical } from 'lucide-react';

type PatientDoctorOrderSummaryProps = {
  clinicalNote?: string;
  orderedKeys?: string[];
  labCatalog?: LabCategory[];
  priceRows?: ServicePriceRow[];
  compact?: boolean;
};

export function hasPatientDoctorOrder(
  note?: string,
  orderedKeys?: string[],
): boolean {
  return Boolean(note?.trim()) || (orderedKeys?.length ?? 0) > 0;
}

export default function PatientDoctorOrderSummary({
  clinicalNote,
  orderedKeys = [],
  labCatalog = [],
  priceRows = [],
  compact = false,
}: PatientDoctorOrderSummaryProps) {
  const note = clinicalNote?.trim() ?? '';
  const keys = orderedKeys.filter(Boolean);
  const lineItems = resolvePostPaymentLineItems(keys, priceRows, labCatalog);
  const priced = lineItems.filter((item) => item.price > 0);
  const total = sumPostPaymentTotal(priced);

  if (!note && keys.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Shifokor buyurtmasi hali kiritilmagan.
      </p>
    );
  }

  if (compact) {
    const parts: string[] = [];
    if (note) parts.push('tashxis');
    if (keys.length > 0) parts.push(`${keys.length} xizmat`);
    return (
      <p className="text-xs font-medium text-violet-700">
        Shifokor: {parts.join(' · ')}
        {total > 0 ? ` · ${total.toLocaleString('uz-UZ')} so'm` : ''}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <div className="flex items-center gap-2 text-violet-800">
        <ClipboardList className="size-4 shrink-0" />
        <p className="text-sm font-semibold">Shifokor buyurtmasi</p>
      </div>

      {note ?
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tashxis / eslatma
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{note}</p>
        </div>
      : null}

      {keys.length > 0 ?
        <div>
          <div className="flex items-center gap-2 text-slate-600">
            <FlaskConical className="size-3.5" />
            <p className="text-xs font-medium uppercase tracking-wide">
              Belgilangan xizmatlar ({keys.length})
            </p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {lineItems.map((item) => (
              <li
                key={item.key}
                className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                <span className="text-slate-800">{item.name}</span>
                <span className="shrink-0 text-slate-600">
                  {item.price > 0 ?
                    `${item.price.toLocaleString('uz-UZ')} so'm`
                  : '—'}
                </span>
              </li>
            ))}
          </ul>
          {total > 0 ?
            <p className="mt-2 text-right text-sm font-semibold text-slate-900">
              Jami: {total.toLocaleString('uz-UZ')} so&apos;m
            </p>
          : null}
        </div>
      : null}
    </div>
  );
}

export function clinicalOverlayFromPatientRow(row: PatientRow | null | undefined) {
  if (!row) return null;
  return {
    note: row.queueClinicalNote,
    keys: row.orderedLaboratoryKeys ?? [],
  };
}
