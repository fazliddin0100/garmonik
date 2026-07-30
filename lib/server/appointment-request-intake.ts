import type { AppointmentRequestIntakePayload } from '@/lib/appointment-requests/intake';
import type { AppointmentRequestRow } from '@/lib/db/appointment-requests';
import {
  insertPatient,
  listPatientCardNumbers,
} from '@/lib/db/patients';
import { ensureKassaPatientForGarmonik } from '@/lib/kassa/patient-bridge';
import {
  readClinicResourcePayload,
  upsertClinicResourcePayload,
} from '@/lib/db/clinic-json-resources';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import type { PatientRow } from '@/lib/patients/types';
import type { QueueRow } from '@/lib/queue/types';

function nextCardNumber(existing: string[]): string {
  const prefix = `KB-${new Date().getFullYear()}-`;
  const max = existing.reduce((acc, cur) => {
    if (!cur.startsWith(prefix)) return acc;
    const n = Number.parseInt(cur.slice(prefix.length), 10);
    if (!Number.isFinite(n)) return acc;
    return Math.max(acc, n);
  }, 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function computeFullName(
  first: string,
  last: string,
  father: string,
): string {
  return [last, first, father].filter(Boolean).join(' ').trim();
}

/** Onlayn arizadan bemor va navbat yaratish */
export async function admitAppointmentRequestToQueue(
  clinicId: string,
  request: AppointmentRequestRow,
  intake: AppointmentRequestIntakePayload,
  referredDoctorName?: string | null,
): Promise<{ patientId: string; cardNumber: string }> {
  if (request.patient_id) {
    return { patientId: request.patient_id, cardNumber: '' };
  }

  const cardRows = await listPatientCardNumbers(clinicId);
  const cardNumber = nextCardNumber(cardRows);
  const fullName = computeFullName(
    intake.firstName,
    intake.lastName,
    intake.fatherName,
  );

  const patient = await insertPatient({
    clinic_id: clinicId,
    card_number: cardNumber,
    first_name: intake.firstName,
    last_name: intake.lastName,
    father_name: intake.fatherName,
    full_name: fullName,
    address: intake.address || request.address,
    phone: intake.phone || request.phone,
    jshshir: '',
    disease_type: intake.diseaseType || request.disease_type,
    gender: intake.gender || null,
    birth_date: null,
    age: intake.age,
    referred_doctor_user_id: intake.referredDoctorUserId,
    created_by_user_id: null,
    updated_at: nowIso(),
  });

  const patientId = String(patient.id);

  try {
    await ensureKassaPatientForGarmonik({
      id: patientId,
      full_name: fullName,
      phone: intake.phone || request.phone,
      birth_date: null,
    });
  } catch (syncError) {
    console.error('kassa patient sync failed:', syncError);
  }

  const existingPatients = await readClinicResourcePayload(clinicId, 'patients');
  const normalized = (Array.isArray(existingPatients) ? existingPatients : [])
    .map(normalizePatientRow)
    .filter((x): x is PatientRow => x !== null);

  const clinicPatient: PatientRow = {
    id: patientId,
    fullName,
    gender: intake.gender,
    birthDate: '',
    diseaseType: intake.diseaseType || request.disease_type,
    address: intake.address || request.address,
    documentType: 'Паспорт Узбекистана',
    documentNumber: '',
    jshshir: '',
    country: '',
    region: '',
    district: '',
    contact: intake.phone || request.phone,
    population: 'Да',
    cardNumber,
    age: intake.age ?? undefined,
    referredDoctorUserId: intake.referredDoctorUserId,
  };

  await upsertClinicResourcePayload(clinicId, 'patients', [
    clinicPatient,
    ...normalized.filter((p) => p.id !== patientId),
  ]);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const queueRow: QueueRow = {
    id: `Q-${now.getTime()}`,
    patientId,
    arrivalTime: `${hh}:${mm}`,
    fullName,
    diseaseType: intake.diseaseType || request.disease_type || 'Umumiy ko‘rik',
    referredDoctorUserId: intake.referredDoctorUserId,
    referredDoctorName: referredDoctorName ?? undefined,
    createdAt: now.toISOString(),
    status: 'waiting_payment',
  };

  const existingQueue = await readClinicResourcePayload(clinicId, 'queue');
  const queueRows = Array.isArray(existingQueue) ? (existingQueue as QueueRow[]) : [];
  const withoutSamePatient = queueRows.filter((r) => r.patientId !== patientId);

  await upsertClinicResourcePayload(clinicId, 'queue', [
    queueRow,
    ...withoutSamePatient,
  ]);

  return { patientId, cardNumber };
}
