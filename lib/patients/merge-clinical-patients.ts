import { fetchClinicResource } from '@/lib/clinic-data/client';
import {
  mapApiPatientToPanelPatient,
  type ApiPatientRecord,
} from '@/lib/patients/map-api-patient';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import type { PatientRow } from '@/lib/patients/types';

/** Klinika JSON dagi klinik ma'lumotlarni Supabase qatoriga qo'shish */
export function mergeClinicalFromJson(base: PatientRow, overlay: PatientRow): PatientRow {
  return {
    ...base,
    fullName: base.fullName || overlay.fullName,
    gender: base.gender || overlay.gender,
    birthDate: base.birthDate || overlay.birthDate,
    jshshir: base.jshshir || overlay.jshshir,
    address: base.address || overlay.address,
    contact: base.contact || overlay.contact,
    diseaseType: base.diseaseType || overlay.diseaseType,
    cardNumber: base.cardNumber || overlay.cardNumber,
    age: base.age ?? overlay.age,
    queueClinicalNote: overlay.queueClinicalNote ?? base.queueClinicalNote,
    orderedLaboratoryKeys: overlay.orderedLaboratoryKeys ?? base.orderedLaboratoryKeys,
    laboratoryResults: overlay.laboratoryResults ?? base.laboratoryResults,
    previousPaidServiceKeys:
      overlay.previousPaidServiceKeys ?? base.previousPaidServiceKeys,
    referredDoctorUserId:
      overlay.referredDoctorUserId ?? base.referredDoctorUserId,
    attendingDoctorUserId:
      overlay.attendingDoctorUserId ?? base.attendingDoctorUserId,
    clinicalCompletedAt:
      overlay.clinicalCompletedAt ?? base.clinicalCompletedAt,
    inpatientAdmissionRequest:
      overlay.inpatientAdmissionRequest ?? base.inpatientAdmissionRequest,
    prescriptions: overlay.prescriptions ?? base.prescriptions,
    clinicalHistory: overlay.clinicalHistory ?? base.clinicalHistory,
    admissionExaminations: overlay.admissionExaminations ?? base.admissionExaminations,
    dutyDoctorExaminations: overlay.dutyDoctorExaminations ?? base.dutyDoctorExaminations,
    primaryExaminations: overlay.primaryExaminations ?? base.primaryExaminations,
    jointExaminations: overlay.jointExaminations ?? base.jointExaminations,
    stageEpicrisisRecords: overlay.stageEpicrisisRecords ?? base.stageEpicrisisRecords,
    specialistConsultations: overlay.specialistConsultations ?? base.specialistConsultations,
    specialistReferrals: overlay.specialistReferrals ?? base.specialistReferrals,
    selectedServiceResults: overlay.selectedServiceResults ?? base.selectedServiceResults,
    labConclusion: overlay.labConclusion ?? base.labConclusion,
  };
}

/** Supabase + klinika JSON bemorlar ro'yxatini birlashtirish */
export async function loadMergedClinicalPatients(): Promise<PatientRow[]> {
  const [patientsRes, jsonPatientsRaw] = await Promise.all([
    fetch('/api/patients', {
      credentials: 'include',
      cache: 'no-store',
    }).catch(() => null),
    fetchClinicResource<PatientRow[]>('patients').catch(() => []),
  ]);

  const clinicalById = new Map<string, PatientRow>();
  for (const item of jsonPatientsRaw) {
    const row = normalizePatientRow(item);
    if (row) clinicalById.set(row.id, row);
  }

  let apiPatients: ApiPatientRecord[] = [];
  if (patientsRes?.ok) {
    const patientsJson = (await patientsRes.json()) as {
      items?: ApiPatientRecord[];
    };
    apiPatients = Array.isArray(patientsJson.items) ? patientsJson.items : [];
  } else {
    apiPatients = [...clinicalById.values()].map((p) => ({
      id: p.id,
      full_name: p.fullName,
      disease_type: p.diseaseType,
      address: p.address,
      phone: p.contact,
      age: p.age ?? null,
      birth_date: p.birthDate || null,
    }));
  }

  const merged = apiPatients.map((api) => {
    const base = mapApiPatientToPanelPatient(api);
    const overlay = clinicalById.get(api.id);
    return overlay ? mergeClinicalFromJson(base, overlay) : base;
  });

  const seen = new Set(merged.map((p) => p.id));
  for (const [id, overlay] of clinicalById) {
    if (!seen.has(id)) {
      merged.push(overlay);
      seen.add(id);
    }
  }

  return merged.sort((a, b) => a.id.localeCompare(b.id, 'uz', { numeric: true }));
}
