import type { PatientRow } from '@/lib/patients/types';
import {
  defaultExaminationDate,
  defaultExaminationTime,
  formatAdmissionExaminationSavedAt,
} from '@/lib/patients/admission-examination';

export type PatientDutyDoctorExamination = {
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
  neuroStatus: string;
  conductedTherapy: string;
  primaryDiagnosis: string;
  comorbidDiagnosis: string;
  backgroundDiagnosis: string;
  complication: string;
  recommendation: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  createdByLogin?: string;
};

export type PatientDutyDoctorExaminationInput = Omit<
  PatientDutyDoctorExamination,
  'id' | 'createdAt' | 'updatedAt' | 'createdByName' | 'createdByLogin'
> & { id?: string };

export function createEmptyDutyDoctorExamination(
  defaults?: Partial<PatientDutyDoctorExaminationInput>,
): PatientDutyDoctorExaminationInput {
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
    neuroStatus: '',
    conductedTherapy: '',
    primaryDiagnosis: '',
    comorbidDiagnosis: '',
    backgroundDiagnosis: '',
    complication: '',
    recommendation: '',
    ...defaults,
  };
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeDutyDoctorExamination(
  raw: unknown,
): PatientDutyDoctorExamination | null {
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
    complaints: trimText(r.complaints),
    anamnesisMorbi: trimText(r.anamnesisMorbi),
    epidemiologicalHistory: trimText(r.epidemiologicalHistory),
    anamnesisVitae: trimText(r.anamnesisVitae),
    statusPraesensObjectivus: trimText(r.statusPraesensObjectivus),
    ekg: trimText(r.ekg),
    neuroStatus: trimText(r.neuroStatus),
    conductedTherapy: trimText(r.conductedTherapy),
    primaryDiagnosis: trimText(r.primaryDiagnosis),
    comorbidDiagnosis: trimText(r.comorbidDiagnosis),
    backgroundDiagnosis: trimText(r.backgroundDiagnosis),
    complication: trimText(r.complication),
    recommendation: trimText(r.recommendation),
    createdAt,
    updatedAt,
    createdByName: trimText(r.createdByName) || undefined,
    createdByLogin: trimText(r.createdByLogin) || undefined,
  };
}

export function normalizeDutyDoctorExaminations(
  raw: unknown,
): PatientDutyDoctorExamination[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeDutyDoctorExamination)
    .filter((x): x is PatientDutyDoctorExamination => x !== null);
  return out.length > 0 ? sortDutyDoctorExaminationsNewestFirst(out) : undefined;
}

export function sortDutyDoctorExaminationsNewestFirst(
  items: PatientDutyDoctorExamination[],
): PatientDutyDoctorExamination[] {
  return [...items].sort((a, b) => {
    const da = `${a.examinationDate}T${a.examinationTime || '00:00'}`;
    const db = `${b.examinationDate}T${b.examinationTime || '00:00'}`;
    const diff = new Date(db).getTime() - new Date(da).getTime();
    if (diff !== 0) return diff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function getPatientDutyDoctorExaminations(
  patient: PatientRow,
): PatientDutyDoctorExamination[] {
  return patient.dutyDoctorExaminations ?? [];
}

export function upsertDutyDoctorExamination(
  patient: PatientRow,
  input: PatientDutyDoctorExaminationInput,
  actor?: { name?: string; login?: string },
): PatientRow {
  const now = new Date().toISOString();
  const prev = getPatientDutyDoctorExaminations(patient);
  const existing = input.id ? prev.find((item) => item.id === input.id) : undefined;

  const nextRecord: PatientDutyDoctorExamination = {
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
    neuroStatus: input.neuroStatus.trim(),
    conductedTherapy: input.conductedTherapy.trim(),
    primaryDiagnosis: input.primaryDiagnosis.trim(),
    comorbidDiagnosis: input.comorbidDiagnosis.trim(),
    backgroundDiagnosis: input.backgroundDiagnosis.trim(),
    complication: input.complication.trim(),
    recommendation: input.recommendation.trim(),
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
    dutyDoctorExaminations: sortDutyDoctorExaminationsNewestFirst(nextList),
  };
}

export function formatDutyDoctorExaminationTitle(item: PatientDutyDoctorExamination): string {
  const [y, m, d] = item.examinationDate.split('-');
  const dateLabel = d && m && y ? `${d}.${m}.${y}` : item.examinationDate;
  const timeLabel = item.examinationTime ? ` · ${item.examinationTime}` : '';
  return `${dateLabel}${timeLabel}`;
}

export { formatAdmissionExaminationSavedAt as formatDutyDoctorExaminationSavedAt };

export const DUTY_DOCTOR_EXAM_FIELD_LABELS = {
  examinationDate: "Ko'rik sanasi",
  examinationTime: 'Vaqt',
  receptionDoctor: 'Qabulxona shifokori',
  complaints: 'Shikoyatlar',
  anamnesisMorbi: 'Anamnesis morbi',
  epidemiologicalHistory: 'Epidemiologik tarix',
  anamnesisVitae: 'Anamnesis vitae',
  statusPraesensObjectivus: 'Status praesens objectivus',
  ekg: 'EKG',
  neuroStatus: 'Neuro status',
  conductedTherapy: "O'tkazilgan terapiya",
  primaryDiagnosis: 'Asosiy tashxis',
  comorbidDiagnosis: 'Yondosh tashxis',
  backgroundDiagnosis: 'Fon tashxisi',
  complication: 'Asorat (agar mavjud bo\'lsa)',
  recommendation: 'Tavsiya',
} as const;

export type DutyDoctorExamTextFieldKey = Exclude<
  keyof PatientDutyDoctorExaminationInput,
  'id' | 'examinationDate' | 'examinationTime' | 'receptionDoctorUserId' | 'receptionDoctorName'
>;

export const DUTY_DOCTOR_EXAM_TEXT_FIELDS: {
  key: DutyDoctorExamTextFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
}[] = [
  { key: 'complaints', label: DUTY_DOCTOR_EXAM_FIELD_LABELS.complaints, placeholder: 'Shikoyatlarni kiriting' },
  { key: 'anamnesisMorbi', label: DUTY_DOCTOR_EXAM_FIELD_LABELS.anamnesisMorbi, placeholder: 'Anamnesis morbi' },
  {
    key: 'epidemiologicalHistory',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.epidemiologicalHistory,
    placeholder: 'Epidemiologik tarix',
  },
  { key: 'anamnesisVitae', label: DUTY_DOCTOR_EXAM_FIELD_LABELS.anamnesisVitae, placeholder: 'Anamnesis vitae' },
  {
    key: 'statusPraesensObjectivus',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.statusPraesensObjectivus,
    placeholder: 'Status praesens objectivus',
  },
  { key: 'ekg', label: DUTY_DOCTOR_EXAM_FIELD_LABELS.ekg, placeholder: 'EKG natijasi yoki tavsifi' },
  { key: 'neuroStatus', label: DUTY_DOCTOR_EXAM_FIELD_LABELS.neuroStatus, placeholder: 'Neuro status' },
  {
    key: 'conductedTherapy',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.conductedTherapy,
    placeholder: "O'tkazilgan terapiya",
  },
  {
    key: 'primaryDiagnosis',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.primaryDiagnosis,
    placeholder: 'Asosiy tashxis',
  },
  {
    key: 'comorbidDiagnosis',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.comorbidDiagnosis,
    placeholder: 'Yondosh tashxis',
  },
  {
    key: 'backgroundDiagnosis',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.backgroundDiagnosis,
    placeholder: 'Fon tashxisi',
  },
  {
    key: 'complication',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.complication,
    placeholder: 'Asorat',
    rows: 3,
  },
  {
    key: 'recommendation',
    label: DUTY_DOCTOR_EXAM_FIELD_LABELS.recommendation,
    placeholder: 'Tavsiya',
    rows: 4,
  },
];
