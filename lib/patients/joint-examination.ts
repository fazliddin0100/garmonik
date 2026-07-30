import type { PatientRow } from '@/lib/patients/types';
import {
  defaultExaminationDate,
  defaultExaminationTime,
  formatAdmissionExaminationSavedAt,
} from '@/lib/patients/admission-examination';

export type PatientJointExamination = {
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
  neuroStatus: string;
  statusLocalis: string;
  labAndInstrumentalDiagnostics: string;
  conductedTherapy: string;
  primaryDiagnosis: string;
  comorbidDiagnosis: string;
  complication: string;
  backgroundDiagnosis: string;
  recommendation: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  createdByLogin?: string;
};

export type PatientJointExaminationInput = Omit<
  PatientJointExamination,
  'id' | 'createdAt' | 'updatedAt' | 'createdByName' | 'createdByLogin'
> & { id?: string };

export function createEmptyJointExamination(
  defaults?: Partial<PatientJointExaminationInput>,
): PatientJointExaminationInput {
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
    neuroStatus: '',
    statusLocalis: '',
    labAndInstrumentalDiagnostics: '',
    conductedTherapy: '',
    primaryDiagnosis: '',
    comorbidDiagnosis: '',
    complication: '',
    backgroundDiagnosis: '',
    recommendation: '',
    ...defaults,
  };
}

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeJointExamination(raw: unknown): PatientJointExamination | null {
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
    neuroStatus: trimText(r.neuroStatus),
    statusLocalis: trimText(r.statusLocalis),
    labAndInstrumentalDiagnostics: trimText(r.labAndInstrumentalDiagnostics),
    conductedTherapy: trimText(r.conductedTherapy),
    primaryDiagnosis: trimText(r.primaryDiagnosis),
    comorbidDiagnosis: trimText(r.comorbidDiagnosis),
    complication: trimText(r.complication),
    backgroundDiagnosis: trimText(r.backgroundDiagnosis),
    recommendation: trimText(r.recommendation),
    createdAt,
    updatedAt,
    createdByName: trimText(r.createdByName) || undefined,
    createdByLogin: trimText(r.createdByLogin) || undefined,
  };
}

export function normalizeJointExaminations(raw: unknown): PatientJointExamination[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeJointExamination)
    .filter((x): x is PatientJointExamination => x !== null);
  return out.length > 0 ? sortJointExaminationsNewestFirst(out) : undefined;
}

export function sortJointExaminationsNewestFirst(
  items: PatientJointExamination[],
): PatientJointExamination[] {
  return [...items].sort((a, b) => {
    const da = `${a.examinationDate}T${a.examinationTime || '00:00'}`;
    const db = `${b.examinationDate}T${b.examinationTime || '00:00'}`;
    const diff = new Date(db).getTime() - new Date(da).getTime();
    if (diff !== 0) return diff;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function getPatientJointExaminations(patient: PatientRow): PatientJointExamination[] {
  return patient.jointExaminations ?? [];
}

export function upsertJointExamination(
  patient: PatientRow,
  input: PatientJointExaminationInput,
  actor?: { name?: string; login?: string },
): PatientRow {
  const now = new Date().toISOString();
  const prev = getPatientJointExaminations(patient);
  const existing = input.id ? prev.find((item) => item.id === input.id) : undefined;

  const nextRecord: PatientJointExamination = {
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
    neuroStatus: input.neuroStatus.trim(),
    statusLocalis: input.statusLocalis.trim(),
    labAndInstrumentalDiagnostics: input.labAndInstrumentalDiagnostics.trim(),
    conductedTherapy: input.conductedTherapy.trim(),
    primaryDiagnosis: input.primaryDiagnosis.trim(),
    comorbidDiagnosis: input.comorbidDiagnosis.trim(),
    complication: input.complication.trim(),
    backgroundDiagnosis: input.backgroundDiagnosis.trim(),
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
    jointExaminations: sortJointExaminationsNewestFirst(nextList),
  };
}

export function formatJointExaminationTitle(item: PatientJointExamination): string {
  const [y, m, d] = item.examinationDate.split('-');
  const dateLabel = d && m && y ? `${d}.${m}.${y}` : item.examinationDate;
  const timeLabel = item.examinationTime ? ` · ${item.examinationTime}` : '';
  return `${dateLabel}${timeLabel}`;
}

export { formatAdmissionExaminationSavedAt as formatJointExaminationSavedAt };

export const JOINT_EXAM_FIELD_LABELS = {
  examinationDate: "Ko'rik sanasi",
  examinationTime: 'Vaqt',
  receptionDoctor: 'Shifokor',
  complaints: 'Shikoyatlar',
  anamnesisMorbi: 'Anamnesis morbi',
  epidemiologicalHistory: 'Epidemiologik tarix',
  anamnesisVitae: 'Anamnesis vitae',
  statusPraesensObjectivus: 'Status praesens objectivus',
  neuroStatus: 'Neuro status',
  statusLocalis: 'Status Localis',
  labAndInstrumentalDiagnostics: 'Laboratoriya va instrumental diagnostika',
  conductedTherapy: "O'tkazilgan terapiya",
  primaryDiagnosis: 'Asosiy tashxis',
  comorbidDiagnosis: 'Yondosh tashxis',
  complication: "Asorat (agar mavjud bo'lsa)",
  backgroundDiagnosis: 'Fon tashxisi',
  recommendation: 'Tavsiya',
} as const;

export type JointExamTextFieldKey = Exclude<
  keyof PatientJointExaminationInput,
  'id' | 'examinationDate' | 'examinationTime' | 'receptionDoctorUserId' | 'receptionDoctorName'
>;

export const JOINT_EXAM_TEXT_FIELDS: {
  key: JointExamTextFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
}[] = [
  {
    key: 'complaints',
    label: JOINT_EXAM_FIELD_LABELS.complaints,
    placeholder: 'Shikoyatlarni kiriting',
    rows: 4,
  },
  {
    key: 'anamnesisMorbi',
    label: JOINT_EXAM_FIELD_LABELS.anamnesisMorbi,
    placeholder: 'Anamnesis morbi',
    rows: 4,
  },
  {
    key: 'epidemiologicalHistory',
    label: JOINT_EXAM_FIELD_LABELS.epidemiologicalHistory,
    placeholder: 'Epidemiologik tarix',
    rows: 4,
  },
  {
    key: 'anamnesisVitae',
    label: JOINT_EXAM_FIELD_LABELS.anamnesisVitae,
    placeholder: 'Anamnesis vitae',
    rows: 4,
  },
  {
    key: 'statusPraesensObjectivus',
    label: JOINT_EXAM_FIELD_LABELS.statusPraesensObjectivus,
    placeholder: 'Status praesens objectivus',
    rows: 6,
  },
  {
    key: 'neuroStatus',
    label: JOINT_EXAM_FIELD_LABELS.neuroStatus,
    placeholder: 'Neuro status',
    rows: 4,
  },
  {
    key: 'statusLocalis',
    label: JOINT_EXAM_FIELD_LABELS.statusLocalis,
    placeholder: 'Status Localis',
    rows: 4,
  },
  {
    key: 'labAndInstrumentalDiagnostics',
    label: JOINT_EXAM_FIELD_LABELS.labAndInstrumentalDiagnostics,
    placeholder: 'Laboratoriya va instrumental diagnostika natijalari',
    rows: 5,
  },
  {
    key: 'conductedTherapy',
    label: JOINT_EXAM_FIELD_LABELS.conductedTherapy,
    placeholder: "O'tkazilgan terapiya",
    rows: 4,
  },
  {
    key: 'primaryDiagnosis',
    label: JOINT_EXAM_FIELD_LABELS.primaryDiagnosis,
    placeholder: 'Asosiy tashxis',
    rows: 3,
  },
  {
    key: 'comorbidDiagnosis',
    label: JOINT_EXAM_FIELD_LABELS.comorbidDiagnosis,
    placeholder: 'Yondosh tashxis',
    rows: 3,
  },
  {
    key: 'complication',
    label: JOINT_EXAM_FIELD_LABELS.complication,
    placeholder: 'Asorat',
    rows: 3,
  },
  {
    key: 'backgroundDiagnosis',
    label: JOINT_EXAM_FIELD_LABELS.backgroundDiagnosis,
    placeholder: 'Fon tashxisi',
    rows: 3,
  },
  {
    key: 'recommendation',
    label: JOINT_EXAM_FIELD_LABELS.recommendation,
    placeholder: 'Tavsiya',
    rows: 4,
  },
];
