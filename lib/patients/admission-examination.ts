import type { PatientRow } from '@/lib/patients/types';

export type PatientAdmissionExamination = {
  id: string;
  examinationDate: string;
  examinationTime: string;
  receptionDoctorUserId: string;
  receptionDoctorName: string;
  complaints: string;
  anamnesisMorbi: string;
  epidemiologicalHistory: string;
  anamnesisVitae: string;
  statusPraesensObjectivus: string;
  ekg: string;
  statusLocalis: string;
  examinationRegulation: string;
  diagnosis: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  createdByLogin?: string;
};

export type PatientAdmissionExaminationInput = Omit<
  PatientAdmissionExamination,
  'id' | 'createdAt' | 'updatedAt' | 'createdByName' | 'createdByLogin'
> & { id?: string };

const TASHKENT_TZ = 'Asia/Tashkent';

export function defaultExaminationDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TASHKENT_TZ }).format(new Date());
}

export function defaultExaminationTime(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TASHKENT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function createEmptyAdmissionExamination(
  defaults?: Partial<PatientAdmissionExaminationInput>,
): PatientAdmissionExaminationInput {
  return {
    examinationDate: defaultExaminationDate(),
    examinationTime: defaultExaminationTime(),
    receptionDoctorUserId: '',
    receptionDoctorName: '',
    complaints: '',
    anamnesisMorbi: '',
    epidemiologicalHistory: '',
    anamnesisVitae: '',
    statusPraesensObjectivus: '',
    ekg: '',
    statusLocalis: '',
    examinationRegulation: '',
    diagnosis: '',
    note: '',
    ...defaults,
  };
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeAdmissionExamination(raw: unknown): PatientAdmissionExamination | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = trimText(r.id);
  const examinationDate = trimText(r.examinationDate);
  const examinationTime = trimText(r.examinationTime);
  const createdAt = trimText(r.createdAt);
  const updatedAt = trimText(r.updatedAt);
  if (!id || !examinationDate || !createdAt || !updatedAt) return null;

  return {
    id,
    examinationDate,
    examinationTime,
    receptionDoctorUserId: trimText(r.receptionDoctorUserId),
    receptionDoctorName: trimText(r.receptionDoctorName),
    complaints: trimText(r.complaints),
    anamnesisMorbi: trimText(r.anamnesisMorbi),
    epidemiologicalHistory: trimText(r.epidemiologicalHistory),
    anamnesisVitae: trimText(r.anamnesisVitae),
    statusPraesensObjectivus: trimText(r.statusPraesensObjectivus),
    ekg: trimText(r.ekg),
    statusLocalis: trimText(r.statusLocalis),
    examinationRegulation: trimText(r.examinationRegulation),
    diagnosis: trimText(r.diagnosis),
    note: trimText(r.note),
    createdAt,
    updatedAt,
    createdByName: trimText(r.createdByName) || undefined,
    createdByLogin: trimText(r.createdByLogin) || undefined,
  };
}

export function normalizeAdmissionExaminations(
  raw: unknown,
): PatientAdmissionExamination[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeAdmissionExamination)
    .filter((x): x is PatientAdmissionExamination => x !== null);
  return out.length > 0 ? sortAdmissionExaminationsNewestFirst(out) : undefined;
}

export function sortAdmissionExaminationsNewestFirst(
  items: PatientAdmissionExamination[],
): PatientAdmissionExamination[] {
  return [...items].sort((a, b) => {
    const da = `${a.examinationDate}T${a.examinationTime || '00:00'}`;
    const db = `${b.examinationDate}T${b.examinationTime || '00:00'}`;
    const diff = new Date(db).getTime() - new Date(da).getTime();
    if (diff !== 0) return diff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function getPatientAdmissionExaminations(
  patient: PatientRow,
): PatientAdmissionExamination[] {
  return patient.admissionExaminations ?? [];
}

export function upsertAdmissionExamination(
  patient: PatientRow,
  input: PatientAdmissionExaminationInput,
  actor?: { name?: string; login?: string },
): PatientRow {
  const now = new Date().toISOString();
  const prev = getPatientAdmissionExaminations(patient);
  const existing = input.id ? prev.find((item) => item.id === input.id) : undefined;

  const nextRecord: PatientAdmissionExamination = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    examinationDate: input.examinationDate.trim(),
    examinationTime: input.examinationTime.trim(),
    receptionDoctorUserId: input.receptionDoctorUserId.trim(),
    receptionDoctorName: input.receptionDoctorName.trim(),
    complaints: input.complaints.trim(),
    anamnesisMorbi: input.anamnesisMorbi.trim(),
    epidemiologicalHistory: input.epidemiologicalHistory.trim(),
    anamnesisVitae: input.anamnesisVitae.trim(),
    statusPraesensObjectivus: input.statusPraesensObjectivus.trim(),
    ekg: input.ekg.trim(),
    statusLocalis: input.statusLocalis.trim(),
    examinationRegulation: input.examinationRegulation.trim(),
    diagnosis: input.diagnosis.trim(),
    note: input.note.trim(),
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
    admissionExaminations: sortAdmissionExaminationsNewestFirst(nextList),
  };
}

export function formatAdmissionExaminationTitle(item: PatientAdmissionExamination): string {
  const [y, m, d] = item.examinationDate.split('-');
  const dateLabel = d && m && y ? `${d}.${m}.${y}` : item.examinationDate;
  const timeLabel = item.examinationTime ? ` · ${item.examinationTime}` : '';
  return `${dateLabel}${timeLabel}`;
}

export function formatAdmissionExaminationSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TASHKENT_TZ,
    });
  } catch {
    return iso;
  }
}

export const ADMISSION_EXAM_FIELD_LABELS = {
  examinationDate: "Ko'rik sanasi",
  examinationTime: 'Vaqt',
  receptionDoctor: 'Qabulxona shifokori',
  complaints: 'Shikoyatlar',
  anamnesisMorbi: 'Anamnesis morbi',
  epidemiologicalHistory: 'Epidemiologik tarix',
  anamnesisVitae: 'Anamnesis vitae',
  statusPraesensObjectivus: 'Status praesens objectivus',
  ekg: 'EKG',
  statusLocalis: 'Status Localis',
  examinationRegulation:
    "Tekshirish (O'zR SSVning 30.11.2021-dagi 273-sonli buyrug'i)",
  diagnosis: 'Tashxis',
  note: 'Izoh',
} as const;
