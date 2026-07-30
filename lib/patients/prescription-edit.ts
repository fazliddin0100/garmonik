import type { PatientPrescription } from '@/lib/patients/prescriptions';
import type { PatientRow } from '@/lib/patients/types';

export type FlatMedicationRow = {
  rxId: string;
  productId: string;
  productName: string;
  unit: string;
  dosage?: string;
  duration?: string;
  note?: string;
  prescribedAt: string;
  prescribedByName?: string;
};

export function flattenPatientMedications(patient: PatientRow): FlatMedicationRow[] {
  const rows: FlatMedicationRow[] = [];
  for (const rx of patient.prescriptions ?? []) {
    for (const item of rx.items) {
      rows.push({
        rxId: rx.id,
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        dosage: item.dosage,
        duration: item.duration,
        note: item.note,
        prescribedAt: rx.prescribedAt,
        prescribedByName: rx.prescribedByName,
      });
    }
  }
  return rows.sort(
    (a, b) => new Date(b.prescribedAt).getTime() - new Date(a.prescribedAt).getTime(),
  );
}

export function removeMedicationFromPatient(
  patient: PatientRow,
  rxId: string,
  productId: string,
): PatientRow {
  const nextRx: PatientPrescription[] = [];
  for (const rx of patient.prescriptions ?? []) {
    if (rx.id !== rxId) {
      nextRx.push(rx);
      continue;
    }
    const items = rx.items.filter((i) => i.productId !== productId);
    if (items.length > 0) {
      nextRx.push({ ...rx, items });
    }
  }
  return {
    ...patient,
    prescriptions: nextRx.length > 0 ? nextRx : undefined,
  };
}
