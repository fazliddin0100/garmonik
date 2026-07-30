import type { PatientRow } from '@/lib/patients/types';
import {
  defaultExaminationDate,
  defaultExaminationTime,
  formatAdmissionExaminationSavedAt,
} from '@/lib/patients/admission-examination';

export type PatientPrimaryExamination = {
  id: string;
  examinationDate: string;
  examinationTime: string;
  receptionDoctorUserId: string;
  receptionDoctorName: string;
  admissionComplaints: string;
  anamnesisMorbi: string;
  epidemiologicalHistory: string;
  anamnesisVitae: string;
  statusPraesensObjectivus: string;
  neuroStatus: string;
  statusLocalis: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  createdByLogin?: string;
};

export type PatientPrimaryExaminationInput = Omit<
  PatientPrimaryExamination,
  'id' | 'createdAt' | 'updatedAt' | 'createdByName' | 'createdByLogin'
> & { id?: string };

export function createEmptyPrimaryExamination(
  defaults?: Partial<PatientPrimaryExaminationInput>,
): PatientPrimaryExaminationInput {
  return {
    examinationDate: defaultExaminationDate(),
    examinationTime: defaultExaminationTime(),
    receptionDoctorUserId: '',
    receptionDoctorName: '',
    admissionComplaints: '',
    anamnesisMorbi: '',
    epidemiologicalHistory: '',
    anamnesisVitae: '',
    statusPraesensObjectivus: '',
    neuroStatus: '',
    statusLocalis: '',
    ...defaults,
  };
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizePrimaryExamination(raw: unknown): PatientPrimaryExamination | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = trimText(r.id);
  const examinationDate = trimText(r.examinationDate);
  const createdAt = trimText(r.createdAt);
  const updatedAt = trimText(r.updatedAt);
  if (!id || !examinationDate || !createdAt || !updatedAt) return null;

  return {
    id,
    examinationDate,
    examinationTime: trimText(r.examinationTime),
    receptionDoctorUserId: trimText(r.receptionDoctorUserId),
    receptionDoctorName: trimText(r.receptionDoctorName),
    admissionComplaints: trimText(r.admissionComplaints),
    anamnesisMorbi: trimText(r.anamnesisMorbi),
    epidemiologicalHistory: trimText(r.epidemiologicalHistory),
    anamnesisVitae: trimText(r.anamnesisVitae),
    statusPraesensObjectivus: trimText(r.statusPraesensObjectivus),
    neuroStatus: trimText(r.neuroStatus),
    statusLocalis: trimText(r.statusLocalis),
    createdAt,
    updatedAt,
    createdByName: trimText(r.createdByName) || undefined,
    createdByLogin: trimText(r.createdByLogin) || undefined,
  };
}

export function normalizePrimaryExaminations(
  raw: unknown,
): PatientPrimaryExamination[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizePrimaryExamination)
    .filter((x): x is PatientPrimaryExamination => x !== null);
  return out.length > 0 ? sortPrimaryExaminationsNewestFirst(out) : undefined;
}

export function sortPrimaryExaminationsNewestFirst(
  items: PatientPrimaryExamination[],
): PatientPrimaryExamination[] {
  return [...items].sort((a, b) => {
    const da = `${a.examinationDate}T${a.examinationTime || '00:00'}`;
    const db = `${b.examinationDate}T${b.examinationTime || '00:00'}`;
    const diff = new Date(db).getTime() - new Date(da).getTime();
    if (diff !== 0) return diff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function getPatientPrimaryExaminations(patient: PatientRow): PatientPrimaryExamination[] {
  return patient.primaryExaminations ?? [];
}

export function getLatestPrimaryExamination(
  patient: PatientRow,
): PatientPrimaryExamination | null {
  const records = getPatientPrimaryExaminations(patient);
  return records[0] ?? null;
}

export function upsertPrimaryExamination(
  patient: PatientRow,
  input: PatientPrimaryExaminationInput,
  actor?: { name?: string; login?: string },
): PatientRow {
  const now = new Date().toISOString();
  const prev = getPatientPrimaryExaminations(patient);
  const existing = input.id ? prev.find((item) => item.id === input.id) : undefined;

  const nextRecord: PatientPrimaryExamination = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    examinationDate: input.examinationDate.trim(),
    examinationTime: input.examinationTime.trim(),
    receptionDoctorUserId: input.receptionDoctorUserId.trim(),
    receptionDoctorName: input.receptionDoctorName.trim(),
    admissionComplaints: input.admissionComplaints.trim(),
    anamnesisMorbi: input.anamnesisMorbi.trim(),
    epidemiologicalHistory: input.epidemiologicalHistory.trim(),
    anamnesisVitae: input.anamnesisVitae.trim(),
    statusPraesensObjectivus: input.statusPraesensObjectivus.trim(),
    neuroStatus: input.neuroStatus.trim(),
    statusLocalis: input.statusLocalis.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdByName: existing?.createdByName ?? (actor?.name?.trim() || undefined),
    createdByLogin: existing?.createdByLogin ?? (actor?.login?.trim() || undefined),
  };

  const nextList =
    existing ?
      prev.map((item) => (item.id === nextRecord.id ? nextRecord : item))
    : [nextRecord, ...prev];

  return {
    ...patient,
    primaryExaminations: sortPrimaryExaminationsNewestFirst(nextList),
  };
}

export function formatPrimaryExaminationTitle(item: PatientPrimaryExamination): string {
  const [y, m, d] = item.examinationDate.split('-');
  const dateLabel = d && m && y ? `${d}.${m}.${y}` : item.examinationDate;
  const timeLabel = item.examinationTime ? ` · ${item.examinationTime}` : '';
  return `${dateLabel}${timeLabel}`;
}

export { formatAdmissionExaminationSavedAt as formatPrimaryExaminationSavedAt };

export const PRIMARY_EXAM_FIELD_LABELS = {
  examinationDate: "Ko'rik sanasi",
  examinationTime: 'Vaqt',
  receptionDoctor: 'Shifokor',
  admissionComplaints: 'Qabuldagi shikoyat',
  anamnesisMorbi: 'Anamnesis morbi',
  epidemiologicalHistory: 'Epidemiologik tarix',
  anamnesisVitae: 'Anamnesis vitae',
  statusPraesensObjectivus: 'Status praesens objectivus',
  neuroStatus: 'Neuro status',
  statusLocalis: 'Status Localis',
} as const;

export type PrimaryExamTextFieldKey = Exclude<
  keyof PatientPrimaryExaminationInput,
  'id' | 'examinationDate' | 'examinationTime' | 'receptionDoctorUserId' | 'receptionDoctorName'
>;

export const PRIMARY_EXAM_TEXT_FIELDS: {
  key: PrimaryExamTextFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
}[] = [
  {
    key: 'admissionComplaints',
    label: PRIMARY_EXAM_FIELD_LABELS.admissionComplaints,
    placeholder:
      'Чанқоқ ҳисси. Оғиз қуриши. Қўл ва оёқларда увишиш. Қизиш ҳисси. Оғриқлар. Тез-тез ҳожатга чиқиш...',
    rows: 5,
  },
  {
    key: 'anamnesisMorbi',
    label: PRIMARY_EXAM_FIELD_LABELS.anamnesisMorbi,
    placeholder: 'Бемор ўзини бир неча ойдан буён касал ҳис қилиб келмоқда...',
    rows: 5,
  },
  {
    key: 'epidemiologicalHistory',
    label: PRIMARY_EXAM_FIELD_LABELS.epidemiologicalHistory,
    placeholder: 'Epidemiologik tarix',
    rows: 4,
  },
  {
    key: 'anamnesisVitae',
    label: PRIMARY_EXAM_FIELD_LABELS.anamnesisVitae,
    placeholder: 'Anamnesis vitae',
    rows: 4,
  },
  {
    key: 'statusPraesensObjectivus',
    label: PRIMARY_EXAM_FIELD_LABELS.statusPraesensObjectivus,
    placeholder:
      'Беморнинг умумий аҳволи ўрта оғир. Тери ва шиллиқ қаватлари қуруқ...',
    rows: 8,
  },
  {
    key: 'neuroStatus',
    label: PRIMARY_EXAM_FIELD_LABELS.neuroStatus,
    placeholder: 'Neuro status',
    rows: 4,
  },
  {
    key: 'statusLocalis',
    label: PRIMARY_EXAM_FIELD_LABELS.statusLocalis,
    placeholder: 'Status Localis',
    rows: 4,
  },
];
