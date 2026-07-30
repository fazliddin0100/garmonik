import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import { resolvePatientBirthIso } from '@/lib/patients/birth-display';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import type { PatientRow } from '@/lib/patients/types';

export type KabinetRegisteredPatient = {
  id: string;
  card_number?: string;
  full_name: string;
  disease_type?: string;
  gender?: string | null;
  birth_date?: string | null;
  address?: string;
  phone?: string;
  jshshir?: string;
  age?: number | null;
};

/** Ro‘yxatdan o‘tgach klinika JSON `patients` ga yozish (shifokor navbati va hisobot uchun) */
export async function upsertClinicPatientFromKabinetIntake(
  patient: KabinetRegisteredPatient,
  referredDoctorUserId: string,
  referredDoctorName?: string,
): Promise<void> {
  const existing = await fetchClinicResource<unknown[]>('patients').catch(() => []);
  const normalized = existing
    .map(normalizePatientRow)
    .filter((x): x is PatientRow => x !== null);

  const prior = normalized.find((p) => p.id === patient.id);

  const row: PatientRow = {
    id: patient.id,
    fullName: patient.full_name,
    gender: patient.gender ?? '',
    birthDate: resolvePatientBirthIso(patient.birth_date, patient.age),
    diseaseType: patient.disease_type ?? '',
    address: patient.address ?? '',
    documentType: 'Паспорт Узбекистана',
    documentNumber: '',
    jshshir: patient.jshshir ?? '',
    country: '',
    region: '',
    district: '',
    contact: patient.phone ?? '',
    population: 'Да',
    cardNumber: patient.card_number,
    age:
      typeof patient.age === 'number' && Number.isFinite(patient.age) ?
        patient.age
      : undefined,
    referredDoctorUserId,
    ...(prior?.queueClinicalNote ? { queueClinicalNote: prior.queueClinicalNote } : {}),
    ...(prior?.orderedLaboratoryKeys?.length ?
      { orderedLaboratoryKeys: prior.orderedLaboratoryKeys }
    : {}),
    ...(prior?.laboratoryResults?.length ?
      { laboratoryResults: prior.laboratoryResults }
    : {}),
    ...(prior?.previousPaidServiceKeys?.length ?
      { previousPaidServiceKeys: prior.previousPaidServiceKeys }
    : {}),
    ...(prior?.attendingDoctorUserId ?
      { attendingDoctorUserId: prior.attendingDoctorUserId }
    : {}),
    ...(prior?.clinicalCompletedAt ?
      { clinicalCompletedAt: prior.clinicalCompletedAt }
    : {}),
  };

  const without = normalized.filter((p) => p.id !== patient.id);
  await saveClinicResource('patients', [row, ...without]);

  void referredDoctorName;
}
