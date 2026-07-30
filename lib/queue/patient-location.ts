import { hasAllLabResultsEntered } from '@/lib/patients/laboratory-results';
import type { PatientRow } from '@/lib/patients/types';
import {
  normalizeQueueRow,
  type QueuePaymentStatusMeta,
  type QueueRow,
} from '@/lib/queue/types';

/** Bemor hozir qaysi bo'limda ekanini ko'rsatish (kabinet navbat jadvali) */
export function getQueuePatientLocationMeta(
  row: QueueRow,
  clinical?: PatientRow | null,
): QueuePaymentStatusMeta {
  const status = normalizeQueueRow(row).status ?? 'waiting_payment';

  if (
    status === 'ready_for_laboratory' &&
    clinical &&
    hasAllLabResultsEntered(clinical)
  ) {
    return {
      label: 'Yakunlangan',
      badgeClassName: 'bg-slate-100 text-slate-700 ring-slate-200',
    };
  }

  switch (status) {
    case 'waiting_payment':
      return {
        label: 'Qabul · Kassada',
        badgeClassName: 'bg-amber-100 text-amber-800 ring-amber-200',
      };
    case 'ready_for_doctor':
      return {
        label: 'Shifokor navbatida',
        badgeClassName: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
      };
    case 'with_doctor':
      return {
        label: 'Shifokorda',
        badgeClassName: 'bg-sky-100 text-sky-800 ring-sky-200',
      };
    case 'waiting_post_payment':
      return {
        label: 'Kassa (tahlil to\'lovi)',
        badgeClassName: 'bg-orange-100 text-orange-800 ring-orange-200',
      };
    case 'ready_for_laboratory':
      return {
        label: 'Laboratoriyada',
        badgeClassName: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
      };
    case 'completed':
      return {
        label: 'Yakunlangan',
        badgeClassName: 'bg-slate-100 text-slate-700 ring-slate-200',
      };
    case 'left':
      return {
        label: 'Ketdi',
        badgeClassName: 'bg-slate-100 text-slate-500 ring-slate-200',
      };
    default:
      return {
        label: 'Qabul',
        badgeClassName: 'bg-amber-100 text-amber-800 ring-amber-200',
      };
  }
}

/** Tahlillar kiritilgach navbat holatini yakunlangan qilish */
export function healQueueRows(queue: QueueRow[], patients: PatientRow[]): QueueRow[] {
  const byId = new Map(patients.map((p) => [p.id, p]));
  let changed = false;

  const next = queue.map((row) => {
    const clinical = byId.get(row.patientId);
    if (
      normalizeQueueRow(row).status === 'ready_for_laboratory' &&
      clinical &&
      hasAllLabResultsEntered(clinical)
    ) {
      changed = true;
      return { ...normalizeQueueRow(row), status: 'completed' as const };
    }
    return row;
  });

  return changed ? next : queue;
}

export function healQueueRowsForPatient(
  queue: QueueRow[],
  patient: PatientRow,
): QueueRow[] {
  return healQueueRows(queue, [patient]);
}
