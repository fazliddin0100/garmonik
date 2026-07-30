import {
  readClinicResourcePayload,
  upsertClinicResourcePayload,
} from '@/lib/db/clinic-json-resources';
import {
  normalizeInpatientAdmission,
  type InpatientAdmission,
} from '@/lib/inpatient/types';
import { filterQueueExcludingInpatients } from '@/lib/queue/inpatient-exclusion';
import { normalizeQueueRow, type QueueRow } from '@/lib/queue/types';

function isQueueRow(value: unknown): value is QueueRow {
  return Boolean(value && typeof value === 'object' && 'patientId' in value);
}

function normalizeQueuePayload(payload: unknown): QueueRow[] {
  if (!Array.isArray(payload)) return [];
  return payload.filter(isQueueRow).map((row) => normalizeQueueRow(row));
}

export function normalizeInpatientAdmissionsPayload(
  payload: unknown,
): InpatientAdmission[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map(normalizeInpatientAdmission)
    .filter((x): x is InpatientAdmission => x !== null);
}

export async function readInpatientAdmissionsForClinic(
  clinicId: string,
): Promise<InpatientAdmission[]> {
  const payload = await readClinicResourcePayload(clinicId, 'inpatient-admissions');
  return normalizeInpatientAdmissionsPayload(payload);
}

/** Statsionardagi bemorlarsiz klinika navbati (API va server o‘qishlari uchun) */
export async function readClinicQueueRows(clinicId: string): Promise<QueueRow[]> {
  const payload = await readClinicResourcePayload(clinicId, 'queue');
  const rows = normalizeQueuePayload(payload);
  const admissions = await readInpatientAdmissionsForClinic(clinicId);
  const filtered = filterQueueExcludingInpatients(rows, admissions);
  if (filtered.length !== rows.length) {
    await upsertClinicResourcePayload(clinicId, 'queue', filtered);
  }
  return filtered;
}

export async function writeClinicQueueRows(
  clinicId: string,
  rows: QueueRow[],
): Promise<void> {
  const normalized = normalizeQueuePayload(rows);
  const admissions = await readInpatientAdmissionsForClinic(clinicId);
  const filtered = filterQueueExcludingInpatients(normalized, admissions);
  await upsertClinicResourcePayload(clinicId, 'queue', filtered);
}

/** Statsionar yozuvi yangilanganda navbatdan statsionar bemorlarni olib tashlash */
export async function syncQueueAfterInpatientAdmissionsWrite(
  clinicId: string,
  admissionsPayload: unknown,
): Promise<void> {
  const admissions = normalizeInpatientAdmissionsPayload(admissionsPayload);
  const payload = await readClinicResourcePayload(clinicId, 'queue');
  const rows = normalizeQueuePayload(payload);
  const nextQueue = filterQueueExcludingInpatients(rows, admissions);
  if (nextQueue.length === rows.length) return;
  await upsertClinicResourcePayload(clinicId, 'queue', nextQueue);
}
