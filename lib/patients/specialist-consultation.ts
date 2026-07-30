import type { PatientRow } from '@/lib/patients/types';
import { defaultExaminationDate, formatAdmissionExaminationSavedAt } from '@/lib/patients/admission-examination';

export type SpecialistReferralStatus = 'pending' | 'completed';

export type PatientSpecialistReferral = {
  id: string;
  specialistId: string;
  specialistLabel: string;
  status: SpecialistReferralStatus;
  referralNote: string;
  referredAt: string;
  referredByUserId?: string;
  referredByName?: string;
  completedAt?: string;
};

export type NarrowSpecialistId =
  | 'uzi'
  | 'surgeon'
  | 'cardiologist'
  | 'neurologist'
  | 'ophthalmologist'
  | 'ent'
  | 'urologist'
  | 'gynecologist'
  | 'radiologist'
  | 'endocrinologist'
  | 'gastroenterologist'
  | 'oncologist'
  | 'physiotherapist'
  | 'dietitian'
  | 'anesthesiologist'
  | 'nephrologist'
  | 'dermatologist'
  | 'psychiatrist';

export type NarrowSpecialistDef = {
  id: NarrowSpecialistId;
  label: string;
};

/** Tor doiradagi mutaxassislar ro'yxati */
export const NARROW_SPECIALISTS: NarrowSpecialistDef[] = [
  { id: 'uzi', label: 'UZI mutaxassisi' },
  { id: 'surgeon', label: 'Jarroh' },
  { id: 'cardiologist', label: 'Kardiolog' },
  { id: 'neurologist', label: 'Nevrolog' },
  { id: 'ophthalmologist', label: 'Oftalmolog' },
  { id: 'ent', label: 'LOR (otolaringolog)' },
  { id: 'urologist', label: 'Urolog' },
  { id: 'gynecologist', label: 'Ginekolog' },
  { id: 'radiologist', label: 'Rentgenolog (KT/MRT)' },
  { id: 'endocrinologist', label: 'Endokrinolog' },
  { id: 'gastroenterologist', label: 'Gastroenterolog' },
  { id: 'oncologist', label: 'Onkolog' },
  { id: 'physiotherapist', label: 'Fizioterapevt / Reabilitolog' },
  { id: 'dietitian', label: 'Dietolog' },
  { id: 'anesthesiologist', label: 'Anesteziolog' },
  { id: 'nephrologist', label: 'Nefrolog' },
  { id: 'dermatologist', label: 'Dermatolog' },
  { id: 'psychiatrist', label: 'Psixiatr / Psixoterapevt' },
];

export function findNarrowSpecialist(id: string): NarrowSpecialistDef | undefined {
  return NARROW_SPECIALISTS.find((item) => item.id === id);
}

export type PatientSpecialistConsultation = {
  id: string;
  specialistId: string;
  specialistLabel: string;
  consultationText: string;
  consultationDate: string;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
  createdByLogin?: string;
};

export type PatientSpecialistConsultationInput = {
  id?: string;
  specialistId: string;
  specialistLabel: string;
  consultationText: string;
  consultationDate: string;
};

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeSpecialistReferral(raw: unknown): PatientSpecialistReferral | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = trimText(r.id);
  const specialistId = trimText(r.specialistId);
  const referredAt = trimText(r.referredAt);
  if (!id || !specialistId || !referredAt) return null;
  const statusRaw = trimText(r.status);
  const status: SpecialistReferralStatus = statusRaw === 'completed' ? 'completed' : 'pending';

  return {
    id,
    specialistId,
    specialistLabel: trimText(r.specialistLabel),
    status,
    referralNote: trimText(r.referralNote),
    referredAt,
    referredByUserId: trimText(r.referredByUserId) || undefined,
    referredByName: trimText(r.referredByName) || undefined,
    completedAt: trimText(r.completedAt) || undefined,
  };
}

export function normalizeSpecialistReferrals(raw: unknown): PatientSpecialistReferral[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeSpecialistReferral)
    .filter((x): x is PatientSpecialistReferral => x !== null);
  return out.length > 0 ? out : undefined;
}

export function getPatientSpecialistReferrals(patient: PatientRow): PatientSpecialistReferral[] {
  return patient.specialistReferrals ?? [];
}

export function getSpecialistReferralForPatient(
  patient: PatientRow,
  specialistId: string,
): PatientSpecialistReferral | undefined {
  return getPatientSpecialistReferrals(patient).find((item) => item.specialistId === specialistId);
}

export function referPatientToSpecialist(
  patient: PatientRow,
  specialistId: string,
  specialistLabel: string,
  actor?: { id?: string; name?: string },
  referralNote = '',
): PatientRow {
  const now = new Date().toISOString();
  const prev = getPatientSpecialistReferrals(patient);
  const existing = prev.find((item) => item.specialistId === specialistId);

  const nextRecord: PatientSpecialistReferral =
    existing ?
      {
        ...existing,
        status: 'pending',
        referralNote: referralNote.trim() || existing.referralNote,
        referredAt: now,
        referredByUserId: actor?.id?.trim() || existing.referredByUserId,
        referredByName: actor?.name?.trim() || existing.referredByName,
        completedAt: undefined,
      }
    : {
        id: crypto.randomUUID(),
        specialistId,
        specialistLabel,
        status: 'pending',
        referralNote: referralNote.trim(),
        referredAt: now,
        referredByUserId: actor?.id?.trim() || undefined,
        referredByName: actor?.name?.trim() || undefined,
      };

  const nextList =
    existing ?
      prev.map((item) => (item.id === nextRecord.id ? nextRecord : item))
    : [...prev, nextRecord];

  return {
    ...patient,
    specialistReferrals: nextList.sort((a, b) =>
      a.specialistLabel.localeCompare(b.specialistLabel, 'uz'),
    ),
  };
}

export function completeSpecialistReferral(
  patient: PatientRow,
  specialistId: string,
): PatientRow {
  const prev = getPatientSpecialistReferrals(patient);
  const existing = prev.find((item) => item.specialistId === specialistId);
  if (!existing) return patient;

  const now = new Date().toISOString();
  const nextRecord: PatientSpecialistReferral = {
    ...existing,
    status: 'completed',
    completedAt: now,
  };

  return {
    ...patient,
    specialistReferrals: prev.map((item) => (item.id === nextRecord.id ? nextRecord : item)),
  };
}

export function patientHasPendingSpecialistReferral(
  patient: PatientRow,
  specialistId: string,
): boolean {
  const referral = getSpecialistReferralForPatient(patient, specialistId);
  return referral?.status === 'pending';
}

export function patientReferredToSpecialist(patient: PatientRow, specialistId: string): boolean {
  return getPatientSpecialistReferrals(patient).some((item) => item.specialistId === specialistId);
}

export function isSpecialistPortalPatient(patient: PatientRow, specialistId: string): boolean {
  return patientHasPendingSpecialistReferral(patient, specialistId);
}

export function normalizeSpecialistConsultation(
  raw: unknown,
): PatientSpecialistConsultation | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = trimText(r.id);
  const specialistId = trimText(r.specialistId);
  const createdAt = trimText(r.createdAt);
  const updatedAt = trimText(r.updatedAt);
  if (!id || !specialistId || !createdAt || !updatedAt) return null;

  return {
    id,
    specialistId,
    specialistLabel: trimText(r.specialistLabel),
    consultationText: trimText(r.consultationText),
    consultationDate: trimText(r.consultationDate) || defaultExaminationDate(),
    createdAt,
    updatedAt,
    createdByName: trimText(r.createdByName) || undefined,
    createdByLogin: trimText(r.createdByLogin) || undefined,
  };
}

export function normalizeSpecialistConsultations(
  raw: unknown,
): PatientSpecialistConsultation[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map(normalizeSpecialistConsultation)
    .filter((x): x is PatientSpecialistConsultation => x !== null);
  return out.length > 0 ? out : undefined;
}

export function getPatientSpecialistConsultations(
  patient: PatientRow,
): PatientSpecialistConsultation[] {
  return patient.specialistConsultations ?? [];
}

export function getSpecialistConsultationForPatient(
  patient: PatientRow,
  specialistId: string,
): PatientSpecialistConsultation | undefined {
  return getPatientSpecialistConsultations(patient).find(
    (item) => item.specialistId === specialistId,
  );
}

export function upsertSpecialistConsultation(
  patient: PatientRow,
  input: PatientSpecialistConsultationInput,
  actor?: { name?: string; login?: string },
): PatientRow {
  const now = new Date().toISOString();
  const prev = getPatientSpecialistConsultations(patient);
  const existing =
    input.id ?
      prev.find((item) => item.id === input.id)
    : prev.find((item) => item.specialistId === input.specialistId.trim());

  const nextRecord: PatientSpecialistConsultation = {
    id: existing?.id ?? input.id ?? crypto.randomUUID(),
    specialistId: input.specialistId.trim(),
    specialistLabel: input.specialistLabel.trim(),
    consultationText: input.consultationText.trim(),
    consultationDate: input.consultationDate.trim() || defaultExaminationDate(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdByName: existing?.createdByName ?? (actor?.name?.trim() || undefined),
    createdByLogin: existing?.createdByLogin ?? (actor?.login?.trim() || undefined),
  };

  const nextList =
    existing ?
      prev.map((item) => (item.id === nextRecord.id ? nextRecord : item))
    : [...prev, nextRecord];

  return completeSpecialistReferral(
    {
      ...patient,
      specialistConsultations: nextList.sort((a, b) =>
        a.specialistLabel.localeCompare(b.specialistLabel, 'uz'),
      ),
    },
    nextRecord.specialistId,
  );
}

export { formatAdmissionExaminationSavedAt as formatSpecialistConsultationSavedAt };
