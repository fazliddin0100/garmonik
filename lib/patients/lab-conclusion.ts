import {
  appendClinicalHistory,
  createLabConclusionHistoryEntry,
} from '@/lib/patients/clinical-history';
import type { PatientRow } from '@/lib/patients/types';

/** Shifokor laboratoriya natijalari asosida yozgan joriy xulosa (ko‘chirma uchun) */
export type PatientLabConclusion = {
  text: string;
  updatedAt: string;
  updatedByName?: string;
  updatedByLogin?: string;
};

export function normalizeLabConclusion(raw: unknown): PatientLabConclusion | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const text = typeof r.text === 'string' ? r.text.trim() : '';
  const updatedAt = typeof r.updatedAt === 'string' ? r.updatedAt.trim() : '';
  if (!text || !updatedAt) return undefined;
  return {
    text,
    updatedAt,
    updatedByName:
      typeof r.updatedByName === 'string' ? r.updatedByName.trim() || undefined : undefined,
    updatedByLogin:
      typeof r.updatedByLogin === 'string' ? r.updatedByLogin.trim() || undefined : undefined,
  };
}

export function getPatientLabConclusion(patient: PatientRow): PatientLabConclusion | undefined {
  return patient.labConclusion;
}

/** Joriy xulosani yangilaydi va klinik tarixga yozuv qo‘shadi */
export function upsertLabConclusion(
  patient: PatientRow,
  text: string,
  actor?: { name?: string; login?: string },
): PatientRow {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ...patient,
      labConclusion: undefined,
    };
  }

  const now = new Date().toISOString();
  const nextConclusion: PatientLabConclusion = {
    text: trimmed,
    updatedAt: now,
    updatedByName: actor?.name?.trim() || undefined,
    updatedByLogin: actor?.login?.trim() || undefined,
  };

  const prevText = patient.labConclusion?.text?.trim() ?? '';
  if (prevText === trimmed) {
    return {
      ...patient,
      labConclusion: {
        ...nextConclusion,
        updatedAt: patient.labConclusion?.updatedAt ?? now,
        updatedByName: patient.labConclusion?.updatedByName ?? nextConclusion.updatedByName,
        updatedByLogin: patient.labConclusion?.updatedByLogin ?? nextConclusion.updatedByLogin,
      },
    };
  }

  const withHistory = appendClinicalHistory(
    patient,
    createLabConclusionHistoryEntry(trimmed, actor),
  );

  return {
    ...withHistory,
    labConclusion: nextConclusion,
  };
}
