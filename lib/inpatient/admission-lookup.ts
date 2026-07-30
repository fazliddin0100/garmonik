import type { InpatientAdmission, InpatientStatus } from '@/lib/inpatient/types';

export function findInpatientByPatientAndStatus(
  admissions: InpatientAdmission[],
  patientId: string,
  status: InpatientStatus,
): InpatientAdmission | null {
  return (
    admissions.find((a) => a.patientId === patientId && a.status === status) ?? null
  );
}

export function findAdmittedInpatient(
  admissions: InpatientAdmission[],
  patientId: string,
): InpatientAdmission | null {
  return findInpatientByPatientAndStatus(admissions, patientId, 'admitted');
}

export function formatInpatientRoomLabel(admission: InpatientAdmission): string {
  const parts = [admission.roomName];
  if (admission.bedLabel) parts.push(admission.bedLabel);
  return parts.join(' · ');
}
