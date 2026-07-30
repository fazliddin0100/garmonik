import type { LaboratoryResultEntry } from '@/lib/patients/laboratory-results';
import type { PatientPrescription } from '@/lib/patients/prescriptions';
import type { PatientRow } from '@/lib/patients/types';

export type ClinicalHistoryKind =
  | 'diagnosis'
  | 'lab_order'
  | 'lab_result'
  | 'lab_conclusion'
  | 'prescription'
  | 'vital_sign'
  | 'medication_change'
  | 'note';

export type VitalSignType =
  | 'blood_pressure'
  | 'pulse'
  | 'temperature'
  | 'weight'
  | 'glucose'
  | 'other';

export type MedicationChangeType = 'started' | 'stopped' | 'adjusted' | 'continued';

export type ClinicalHistoryEntry = {
  id: string;
  kind: ClinicalHistoryKind;
  recordedAt: string;
  recordedByName?: string;
  recordedByLogin?: string;
  text?: string;
  orderedLaboratoryKeys?: string[];
  laboratoryResults?: LaboratoryResultEntry[];
  prescription?: PatientPrescription;
  vitalType?: VitalSignType;
  vitalValue?: string;
  vitalUnit?: string;
  medicationName?: string;
  medicationChange?: MedicationChangeType;
  medicationDosage?: string;
};

export const CLINICAL_HISTORY_KIND_LABELS: Record<ClinicalHistoryKind, string> = {
  diagnosis: 'Tashxis',
  lab_order: 'Tahlil buyurtmasi',
  lab_result: 'Tahlil natijalari',
  lab_conclusion: 'Laboratoriya xulosasi',
  prescription: 'Dori retsepti',
  vital_sign: 'Kuzatuv ko‘rsatkichi',
  medication_change: 'Dori o‘zgarishi',
  note: 'Shifokor eslatmasi',
};

export const VITAL_SIGN_LABELS: Record<VitalSignType, string> = {
  blood_pressure: 'Qon bosimi',
  pulse: 'Puls',
  temperature: 'Harorat',
  weight: 'Vazn',
  glucose: 'Qand darajasi',
  other: 'Boshqa',
};

export const MEDICATION_CHANGE_LABELS: Record<MedicationChangeType, string> = {
  started: 'Boshlandi',
  stopped: 'To‘xtatildi',
  adjusted: 'O‘zgartirildi',
  continued: 'Davom etiladi',
};

function newHistoryId(): string {
  return crypto.randomUUID();
}

function actorFields(actorName?: string, actorLogin?: string) {
  return {
    recordedByName: actorName?.trim() || undefined,
    recordedByLogin: actorLogin?.trim() || undefined,
  };
}

export function createDiagnosisHistoryEntry(
  text: string,
  actor?: { name?: string; login?: string },
): ClinicalHistoryEntry {
  return {
    id: newHistoryId(),
    kind: 'diagnosis',
    recordedAt: new Date().toISOString(),
    text: text.trim(),
    ...actorFields(actor?.name, actor?.login),
  };
}

export function createLabOrderHistoryEntry(
  keys: string[],
  actor?: { name?: string; login?: string },
): ClinicalHistoryEntry {
  return {
    id: newHistoryId(),
    kind: 'lab_order',
    recordedAt: new Date().toISOString(),
    orderedLaboratoryKeys: [...keys],
    text: `${keys.length} ta tahlil/xizmat belgilandi`,
    ...actorFields(actor?.name, actor?.login),
  };
}

export function createLabResultHistoryEntry(
  results: LaboratoryResultEntry[],
  actor?: { name?: string; login?: string },
): ClinicalHistoryEntry {
  const filled = results.filter((r) => r.value.trim());
  return {
    id: newHistoryId(),
    kind: 'lab_result',
    recordedAt: new Date().toISOString(),
    laboratoryResults: filled,
    text: `${filled.length} ta natija kiritildi`,
    ...actorFields(actor?.name, actor?.login),
  };
}

export function createPrescriptionHistoryEntry(
  prescription: PatientPrescription,
): ClinicalHistoryEntry {
  return {
    id: newHistoryId(),
    kind: 'prescription',
    recordedAt: prescription.prescribedAt,
    prescription,
    text: `${prescription.items.length} ta dori belgilandi`,
    recordedByName: prescription.prescribedByName,
    recordedByLogin: prescription.prescribedByLogin,
  };
}

export function createVitalHistoryEntry(
  vitalType: VitalSignType,
  vitalValue: string,
  vitalUnit?: string,
  actor?: { name?: string; login?: string },
): ClinicalHistoryEntry {
  const label = VITAL_SIGN_LABELS[vitalType];
  const unit = vitalUnit?.trim() || '';
  return {
    id: newHistoryId(),
    kind: 'vital_sign',
    recordedAt: new Date().toISOString(),
    vitalType,
    vitalValue: vitalValue.trim(),
    vitalUnit: unit || undefined,
    text: `${label}: ${vitalValue.trim()}${unit ? ` ${unit}` : ''}`,
    ...actorFields(actor?.name, actor?.login),
  };
}

export function createMedicationChangeHistoryEntry(
  medicationName: string,
  change: MedicationChangeType,
  dosage?: string,
  note?: string,
  actor?: { name?: string; login?: string },
): ClinicalHistoryEntry {
  const parts = [
    medicationName.trim(),
    MEDICATION_CHANGE_LABELS[change],
    dosage?.trim(),
    note?.trim(),
  ].filter(Boolean);
  return {
    id: newHistoryId(),
    kind: 'medication_change',
    recordedAt: new Date().toISOString(),
    medicationName: medicationName.trim(),
    medicationChange: change,
    medicationDosage: dosage?.trim() || undefined,
    text: parts.join(' · '),
    ...actorFields(actor?.name, actor?.login),
  };
}

export function createNoteHistoryEntry(
  text: string,
  actor?: { name?: string; login?: string },
): ClinicalHistoryEntry {
  return {
    id: newHistoryId(),
    kind: 'note',
    recordedAt: new Date().toISOString(),
    text: text.trim(),
    ...actorFields(actor?.name, actor?.login),
  };
}

export function createLabConclusionHistoryEntry(
  text: string,
  actor?: { name?: string; login?: string },
): ClinicalHistoryEntry {
  return {
    id: newHistoryId(),
    kind: 'lab_conclusion',
    recordedAt: new Date().toISOString(),
    text: text.trim(),
    ...actorFields(actor?.name, actor?.login),
  };
}

export function normalizeClinicalHistoryEntry(raw: unknown): ClinicalHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const kind = r.kind as ClinicalHistoryKind;
  const recordedAt = typeof r.recordedAt === 'string' ? r.recordedAt.trim() : '';
  if (!id || !recordedAt || !CLINICAL_HISTORY_KIND_LABELS[kind]) return null;

  const orderedLaboratoryKeys = Array.isArray(r.orderedLaboratoryKeys)
    ? r.orderedLaboratoryKeys.filter((x): x is string => typeof x === 'string')
    : undefined;

  const laboratoryResults = Array.isArray(r.laboratoryResults)
    ? (r.laboratoryResults as LaboratoryResultEntry[])
    : undefined;

  let prescription: PatientPrescription | undefined;
  if (r.prescription && typeof r.prescription === 'object') {
    const p = r.prescription as PatientPrescription;
    if (typeof p.id === 'string' && Array.isArray(p.items)) prescription = p;
  }

  return {
    id,
    kind,
    recordedAt,
    recordedByName:
      typeof r.recordedByName === 'string' ? r.recordedByName.trim() || undefined : undefined,
    recordedByLogin:
      typeof r.recordedByLogin === 'string' ? r.recordedByLogin.trim() || undefined : undefined,
    text: typeof r.text === 'string' ? r.text.trim() || undefined : undefined,
    orderedLaboratoryKeys:
      orderedLaboratoryKeys && orderedLaboratoryKeys.length > 0 ?
        orderedLaboratoryKeys
      : undefined,
    laboratoryResults,
    prescription,
    vitalType:
      typeof r.vitalType === 'string' ?
        (r.vitalType as VitalSignType)
      : undefined,
    vitalValue: typeof r.vitalValue === 'string' ? r.vitalValue.trim() || undefined : undefined,
    vitalUnit: typeof r.vitalUnit === 'string' ? r.vitalUnit.trim() || undefined : undefined,
    medicationName:
      typeof r.medicationName === 'string' ? r.medicationName.trim() || undefined : undefined,
    medicationChange:
      typeof r.medicationChange === 'string' ?
        (r.medicationChange as MedicationChangeType)
      : undefined,
    medicationDosage:
      typeof r.medicationDosage === 'string' ? r.medicationDosage.trim() || undefined : undefined,
  };
}

export function normalizeClinicalHistory(raw: unknown): ClinicalHistoryEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map(normalizeClinicalHistoryEntry).filter((x): x is ClinicalHistoryEntry => x !== null);
  return out.length > 0 ? out : undefined;
}

export function sortHistoryNewestFirst(entries: ClinicalHistoryEntry[]): ClinicalHistoryEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
}

export function appendClinicalHistory(
  patient: PatientRow,
  entry: ClinicalHistoryEntry,
): PatientRow {
  const prev = patient.clinicalHistory ?? [];
  return {
    ...patient,
    clinicalHistory: sortHistoryNewestFirst([entry, ...prev]),
  };
}

export function appendClinicalHistoryMany(
  patient: PatientRow,
  entries: ClinicalHistoryEntry[],
): PatientRow {
  if (entries.length === 0) return patient;
  const prev = patient.clinicalHistory ?? [];
  return {
    ...patient,
    clinicalHistory: sortHistoryNewestFirst([...entries, ...prev]),
  };
}

/** Eski maydonlardan tarixni tiklash (mavjud bemorlar uchun) */
export function bootstrapClinicalHistory(patient: PatientRow): ClinicalHistoryEntry[] {
  if (patient.clinicalHistory?.length) {
    return sortHistoryNewestFirst(patient.clinicalHistory);
  }

  const out: ClinicalHistoryEntry[] = [];
  const at = patient.clinicalCompletedAt ?? new Date(0).toISOString();

  if (patient.queueClinicalNote?.trim()) {
    out.push({
      id: `legacy-diagnosis-${patient.id}`,
      kind: 'diagnosis',
      recordedAt: at,
      text: patient.queueClinicalNote.trim(),
    });
  }

  if ((patient.orderedLaboratoryKeys?.length ?? 0) > 0) {
    out.push({
      id: `legacy-lab-order-${patient.id}`,
      kind: 'lab_order',
      recordedAt: at,
      orderedLaboratoryKeys: [...patient.orderedLaboratoryKeys!],
      text: `${patient.orderedLaboratoryKeys!.length} ta tahlil/xizmat`,
    });
  }

  if ((patient.laboratoryResults?.length ?? 0) > 0) {
    const filled = patient.laboratoryResults!.filter((r) => r.value.trim());
    if (filled.length > 0) {
      const latest = filled.reduce((acc, r) => {
        const t = r.enteredAt ? new Date(r.enteredAt).getTime() : 0;
        return t > acc ? t : acc;
      }, 0);
      out.push({
        id: `legacy-lab-result-${patient.id}`,
        kind: 'lab_result',
        recordedAt: latest > 0 ? new Date(latest).toISOString() : at,
        laboratoryResults: filled,
        text: `${filled.length} ta natija`,
      });
    }
  }

  for (const rx of patient.prescriptions ?? []) {
    out.push(createPrescriptionHistoryEntry(rx));
  }

  return sortHistoryNewestFirst(out);
}

export function getPatientClinicalHistory(patient: PatientRow): ClinicalHistoryEntry[] {
  return bootstrapClinicalHistory(patient);
}

export function formatHistoryDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tashkent',
    });
  } catch {
    return iso;
  }
}

const TASHKENT_TZ = 'Asia/Tashkent';

export function historyEntryDayKey(entry: ClinicalHistoryEntry): string {
  const iso =
    entry.kind === 'prescription' && entry.prescription ?
      entry.prescription.prescribedAt
    : entry.recordedAt;
  return isoToDayKey(iso);
}

export function isoToDayKey(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TASHKENT_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatHistoryDayButtonLabel(dayKey: string): string {
  const today = isoToDayKey(new Date().toISOString());
  const yesterday = isoToDayKey(new Date(Date.now() - 86_400_000).toISOString());
  if (dayKey === today) return 'Bugun';
  if (dayKey === yesterday) return 'Kecha';
  const [y, m, d] = dayKey.split('-');
  if (y && m && d) return `${d}.${m}.${y}`;
  return dayKey;
}

export type ClinicalHistoryDayGroup = {
  dayKey: string;
  label: string;
  entries: ClinicalHistoryEntry[];
};

export function groupClinicalHistoryByDay(
  entries: ClinicalHistoryEntry[],
): ClinicalHistoryDayGroup[] {
  const map = new Map<string, ClinicalHistoryEntry[]>();
  for (const entry of entries) {
    const key = historyEntryDayKey(entry);
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, dayEntries]) => ({
      dayKey,
      label: formatHistoryDayButtonLabel(dayKey),
      entries: sortHistoryNewestFirst(dayEntries),
    }));
}

export function historyEntriesForKind(
  patient: PatientRow,
  kind: ClinicalHistoryKind,
): ClinicalHistoryEntry[] {
  return getPatientClinicalHistory(patient).filter((e) => e.kind === kind);
}
