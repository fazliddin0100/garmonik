import type { PatientRow } from '@/lib/patients/types';
import type { PatientPrimaryExamination } from '@/lib/patients/primary-examination';
import {
  defaultExaminationDate,
  defaultExaminationTime,
  formatAdmissionExaminationSavedAt,
} from '@/lib/patients/admission-examination';

export type PatientStageEpicrisis = {
  id: string;
  examinationDate: string;
  examinationTime: string;
  receptionDoctorUserId: string;
  receptionDoctorName: string;
  primaryDiagnosis: string;
  comorbidDiagnosis: string;
  additionalDiagnosis: string;
  complication: string;
  complaints: string;
  anamnesisMorbi: string;
  epidemiologicalHistory: string;
  anamnesisVitae: string;
  statusPraesensObjectivus: string;
  neuroStatus: string;
  statusLocalis: string;
  labAndInstrumentalDiagnostics: string;
  conductedTherapy: string;
  recommendation: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  createdByLogin?: string;
};

export type PatientStageEpicrisisInput = Omit<
  PatientStageEpicrisis,
  'id' | 'createdAt' | 'updatedAt' | 'createdByName' | 'createdByLogin'
> & { id?: string };

export function createEmptyStageEpicrisis(
  defaults?: Partial<PatientStageEpicrisisInput>,
): PatientStageEpicrisisInput {
  return {
    examinationDate: defaultExaminationDate(),
    examinationTime: defaultExaminationTime(),
    receptionDoctorUserId: '',
    receptionDoctorName: '',
    primaryDiagnosis: '',
    comorbidDiagnosis: '',
    additionalDiagnosis: '',
    complication: '',
    complaints: '',
    anamnesisMorbi: '',
    epidemiologicalHistory: '',
    anamnesisVitae: '',
    statusPraesensObjectivus: '',
    neuroStatus: '',
    statusLocalis: '',
    labAndInstrumentalDiagnostics: '',
    conductedTherapy: '',
    recommendation: '',
    ...defaults,
  };
}

/** Birlamchi tekshiruvdan bosqichli epikriz maydonlarini to'ldirish */
export function stageEpicrisisDefaultsFromPrimaryExam(
  exam: PatientPrimaryExamination,
): Partial<PatientStageEpicrisisInput> {
  return {
    examinationDate: exam.examinationDate,
    examinationTime: exam.examinationTime,
    receptionDoctorUserId: exam.receptionDoctorUserId,
    receptionDoctorName: exam.receptionDoctorName,
    complaints: exam.admissionComplaints,
    anamnesisMorbi: exam.anamnesisMorbi,
    epidemiologicalHistory: exam.epidemiologicalHistory,
    anamnesisVitae: exam.anamnesisVitae,
    statusPraesensObjectivus: exam.statusPraesensObjectivus,
    neuroStatus: exam.neuroStatus,
    statusLocalis: exam.statusLocalis,
  };
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeStageEpicrisis(raw: unknown): PatientStageEpicrisis | null {
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
    primaryDiagnosis: trimText(r.primaryDiagnosis),
    comorbidDiagnosis: trimText(r.comorbidDiagnosis),
    additionalDiagnosis: trimText(r.additionalDiagnosis),
    complication: trimText(r.complication),
    complaints: trimText(r.complaints),
    anamnesisMorbi: trimText(r.anamnesisMorbi),
    epidemiologicalHistory: trimText(r.epidemiologicalHistory),
    anamnesisVitae: trimText(r.anamnesisVitae),
    statusPraesensObjectivus: trimText(r.statusPraesensObjectivus),
    neuroStatus: trimText(r.neuroStatus),
    statusLocalis: trimText(r.statusLocalis),
    labAndInstrumentalDiagnostics: trimText(r.labAndInstrumentalDiagnostics),
    conductedTherapy: trimText(r.conductedTherapy),
    recommendation: trimText(r.recommendation),
    createdAt,
    updatedAt,
    createdByName: trimText(r.createdByName) || undefined,
    createdByLogin: trimText(r.createdByLogin) || undefined,
  };
}

export function normalizeStageEpicrisisRecords(
  raw: unknown,
): PatientStageEpicrisis[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeStageEpicrisis)
    .filter((x): x is PatientStageEpicrisis => x !== null);
  return out.length > 0 ? sortStageEpicrisisNewestFirst(out) : undefined;
}

export function sortStageEpicrisisNewestFirst(
  items: PatientStageEpicrisis[],
): PatientStageEpicrisis[] {
  return [...items].sort((a, b) => {
    const da = `${a.examinationDate}T${a.examinationTime || '00:00'}`;
    const db = `${b.examinationDate}T${b.examinationTime || '00:00'}`;
    const diff = new Date(db).getTime() - new Date(da).getTime();
    if (diff !== 0) return diff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function getPatientStageEpicrisisRecords(patient: PatientRow): PatientStageEpicrisis[] {
  return patient.stageEpicrisisRecords ?? [];
}

export function upsertStageEpicrisis(
  patient: PatientRow,
  input: PatientStageEpicrisisInput,
  actor?: { name?: string; login?: string },
): PatientRow {
  const now = new Date().toISOString();
  const prev = getPatientStageEpicrisisRecords(patient);
  const existing = input.id ? prev.find((item) => item.id === input.id) : undefined;

  const nextRecord: PatientStageEpicrisis = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    examinationDate: input.examinationDate.trim(),
    examinationTime: input.examinationTime.trim(),
    receptionDoctorUserId: input.receptionDoctorUserId.trim(),
    receptionDoctorName: input.receptionDoctorName.trim(),
    primaryDiagnosis: input.primaryDiagnosis.trim(),
    comorbidDiagnosis: input.comorbidDiagnosis.trim(),
    additionalDiagnosis: input.additionalDiagnosis.trim(),
    complication: input.complication.trim(),
    complaints: input.complaints.trim(),
    anamnesisMorbi: input.anamnesisMorbi.trim(),
    epidemiologicalHistory: input.epidemiologicalHistory.trim(),
    anamnesisVitae: input.anamnesisVitae.trim(),
    statusPraesensObjectivus: input.statusPraesensObjectivus.trim(),
    neuroStatus: input.neuroStatus.trim(),
    statusLocalis: input.statusLocalis.trim(),
    labAndInstrumentalDiagnostics: input.labAndInstrumentalDiagnostics.trim(),
    conductedTherapy: input.conductedTherapy.trim(),
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
    stageEpicrisisRecords: sortStageEpicrisisNewestFirst(nextList),
  };
}

export function formatStageEpicrisisTitle(item: PatientStageEpicrisis): string {
  const [y, m, d] = item.examinationDate.split('-');
  const dateLabel = d && m && y ? `${d}.${m}.${y}` : item.examinationDate;
  const timeLabel = item.examinationTime ? ` · ${item.examinationTime}` : '';
  return `${dateLabel}${timeLabel}`;
}

export { formatAdmissionExaminationSavedAt as formatStageEpicrisisSavedAt };

export const STAGE_EPICRISIS_FIELD_LABELS = {
  examinationDate: "Ko'rik sanasi",
  examinationTime: 'Vaqt',
  receptionDoctor: 'Shifokor',
  primaryDiagnosis: 'Asosiy tashxis',
  comorbidDiagnosis: 'Yondosh tashxis',
  additionalDiagnosis: "Qo'shimcha tashxis",
  complication: "Asorat (agar mavjud bo'lsa)",
  complaints: 'Shikoyatlar',
  anamnesisMorbi: 'Anamnesis morbi',
  epidemiologicalHistory: 'Epidemiologik tarix',
  anamnesisVitae: 'Anamnesis vitae',
  statusPraesensObjectivus: 'Status praesens objectivus',
  neuroStatus: 'Neuro status',
  statusLocalis: 'Status Localis',
  labAndInstrumentalDiagnostics: 'Laboratoriya va instrumental diagnostika',
  conductedTherapy: "O'tkazilgan terapiya",
  recommendation: 'Tavsiya',
} as const;

export type StageEpicrisisTextFieldKey = Exclude<
  keyof PatientStageEpicrisisInput,
  'id' | 'examinationDate' | 'examinationTime' | 'receptionDoctorUserId' | 'receptionDoctorName'
>;

export const STAGE_EPICRISIS_TEXT_FIELDS: {
  key: StageEpicrisisTextFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
}[] = [
  {
    key: 'primaryDiagnosis',
    label: STAGE_EPICRISIS_FIELD_LABELS.primaryDiagnosis,
    placeholder: 'Asosiy tashxis',
    rows: 3,
  },
  {
    key: 'comorbidDiagnosis',
    label: STAGE_EPICRISIS_FIELD_LABELS.comorbidDiagnosis,
    placeholder: 'Yondosh tashxis',
    rows: 3,
  },
  {
    key: 'additionalDiagnosis',
    label: STAGE_EPICRISIS_FIELD_LABELS.additionalDiagnosis,
    placeholder: "Qo'shimcha tashxis",
    rows: 3,
  },
  {
    key: 'complication',
    label: STAGE_EPICRISIS_FIELD_LABELS.complication,
    placeholder: 'Asorat',
    rows: 3,
  },
  {
    key: 'complaints',
    label: STAGE_EPICRISIS_FIELD_LABELS.complaints,
    placeholder: 'Shikoyatlarni kiriting',
    rows: 4,
  },
  {
    key: 'anamnesisMorbi',
    label: STAGE_EPICRISIS_FIELD_LABELS.anamnesisMorbi,
    placeholder: 'Anamnesis morbi',
    rows: 4,
  },
  {
    key: 'epidemiologicalHistory',
    label: STAGE_EPICRISIS_FIELD_LABELS.epidemiologicalHistory,
    placeholder: 'Epidemiologik tarix',
    rows: 4,
  },
  {
    key: 'anamnesisVitae',
    label: STAGE_EPICRISIS_FIELD_LABELS.anamnesisVitae,
    placeholder: 'Anamnesis vitae',
    rows: 4,
  },
  {
    key: 'statusPraesensObjectivus',
    label: STAGE_EPICRISIS_FIELD_LABELS.statusPraesensObjectivus,
    placeholder: 'Status praesens objectivus',
    rows: 6,
  },
  {
    key: 'neuroStatus',
    label: STAGE_EPICRISIS_FIELD_LABELS.neuroStatus,
    placeholder: 'Neuro status',
    rows: 4,
  },
  {
    key: 'statusLocalis',
    label: STAGE_EPICRISIS_FIELD_LABELS.statusLocalis,
    placeholder: 'Status Localis',
    rows: 4,
  },
  {
    key: 'labAndInstrumentalDiagnostics',
    label: STAGE_EPICRISIS_FIELD_LABELS.labAndInstrumentalDiagnostics,
    placeholder: 'Laboratoriya va instrumental diagnostika natijalari',
    rows: 5,
  },
  {
    key: 'conductedTherapy',
    label: STAGE_EPICRISIS_FIELD_LABELS.conductedTherapy,
    placeholder: "O'tkazilgan terapiya",
    rows: 4,
  },
  {
    key: 'recommendation',
    label: STAGE_EPICRISIS_FIELD_LABELS.recommendation,
    placeholder: 'Tavsiya',
    rows: 4,
  },
];
