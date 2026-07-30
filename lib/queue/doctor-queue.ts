import { listPatientsByClinic } from '@/lib/db/patients';
import { readClinicQueueRows } from '@/lib/queue/clinic-queue-store';
import {
  getQueuePaymentStatusMeta,
  isVisibleToDoctor,
  normalizeQueueRow,
  type QueueRow,
} from '@/lib/queue/types';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
export type DoctorQueueItem = {
  queueId: string;
  patientId: string;
  arrivalTime: string;
  fullName: string;
  cardNumber: string;
  diseaseType: string;
  referredDoctorName?: string;
  status: string;
  paymentLabel: string;
  paymentBadgeClassName: string;
  createdAt?: string;
};

async function readQueueRows(clinicId: string): Promise<QueueRow[]> {
  return readClinicQueueRows(clinicId);
}
function resolveDoctorId(
  row: QueueRow,
  patientDoctorId: string | null | undefined,
): string | undefined {
  return row.referredDoctorUserId ?? patientDoctorId ?? undefined;
}

export async function listDoctorQueue(doctorUserId: string): Promise<DoctorQueueItem[]> {
  const clinicId = await getDefaultClinicId();
  const [queueRows, patients] = await Promise.all([
    readQueueRows(clinicId),
    listPatientsByClinic(clinicId),
  ]);

  const patientById = new Map(patients.map((p) => [String(p.id), p]));

  return queueRows
    .filter((row) => {
      if (!isVisibleToDoctor(row)) return false;
      const patient = patientById.get(row.patientId);
      const doctorId = resolveDoctorId(
        row,
        patient?.referred_doctor_user_id ? String(patient.referred_doctor_user_id) : undefined,
      );
      return doctorId === doctorUserId;
    })
    .sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (ta !== tb) return ta - tb;
      return a.arrivalTime.localeCompare(b.arrivalTime);
    })
    .map((row) => {
      const patient = patientById.get(row.patientId);
      const paymentMeta = getQueuePaymentStatusMeta(row.status);
      return {
        queueId: row.id,
        patientId: row.patientId,
        arrivalTime: row.arrivalTime,
        fullName: patient?.full_name ? String(patient.full_name) : row.fullName,
        cardNumber: patient?.card_number ? String(patient.card_number) : row.patientId,
        diseaseType: row.diseaseType || String(patient?.disease_type ?? ''),
        referredDoctorName: row.referredDoctorName,
        status: row.status ?? 'ready_for_doctor',
        paymentLabel: paymentMeta.label,
        paymentBadgeClassName: paymentMeta.badgeClassName,
        createdAt: row.createdAt,
      };
    });
}
