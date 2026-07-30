import { listPatientsByClinic } from '@/lib/db/patients';
import { readClinicResourcePayload } from '@/lib/db/clinic-json-resources';
import { readClinicQueueRows } from '@/lib/queue/clinic-queue-store';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import type { PatientRow } from '@/lib/patients/types';
import {
  resolvePostPaymentLineItems,
  sumPostPaymentTotal,
} from '@/lib/queue/post-payment-items';
import {
  isReadyForLaboratory,
  normalizeQueueRow,
  type QueueRow,
} from '@/lib/queue/types';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import { SERVICE_PRICE_ROWS, type ServicePriceRow } from '@/lib/services/pricing-data';
import { getDefaultClinicId } from '@/lib/server/default-clinic';

export type LaboratoryQueueItem = {
  queueId: string;
  patientId: string;
  arrivalTime: string;
  fullName: string;
  cardNumber: string;
  diseaseType: string;
  referredDoctorName?: string;
  orderCount: number;
  orderTotal: number;
  orderSummary: string;
  createdAt?: string;
};

async function readQueueRows(clinicId: string): Promise<QueueRow[]> {
  return readClinicQueueRows(clinicId);
}

async function readClinicalPatients(clinicId: string): Promise<Map<string, PatientRow>> {
  const payload = await readClinicResourcePayload(clinicId, 'patients');
  const map = new Map<string, PatientRow>();
  if (!Array.isArray(payload)) return map;
  for (const item of payload) {
    const row = normalizePatientRow(item);
    if (row) map.set(row.id, row);
  }
  return map;
}

async function readPriceRows(clinicId: string): Promise<ServicePriceRow[]> {
  const payload = await readClinicResourcePayload(clinicId, 'service-prices');
  if (Array.isArray(payload) && payload.length > 0) {
    return payload as ServicePriceRow[];
  }
  return SERVICE_PRICE_ROWS;
}

async function readLabCatalog(clinicId: string): Promise<LabCategory[]> {
  const payload = await readClinicResourcePayload(clinicId, 'lab-catalog');
  return Array.isArray(payload) ? (payload as LabCategory[]) : [];
}

export async function listLaboratoryQueue(): Promise<LaboratoryQueueItem[]> {
  const clinicId = await getDefaultClinicId();
  const [queueRows, patients, clinicalById, priceRows, labCatalog] = await Promise.all([
    readQueueRows(clinicId),
    listPatientsByClinic(clinicId),
    readClinicalPatients(clinicId),
    readPriceRows(clinicId),
    readLabCatalog(clinicId),
  ]);

  const patientById = new Map(patients.map((p) => [String(p.id), p]));

  return queueRows
    .filter(isReadyForLaboratory)
    .filter((row) => {
      const clinical = clinicalById.get(row.patientId);
      return (clinical?.orderedLaboratoryKeys?.length ?? 0) > 0;
    })
    .sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (ta !== tb) return ta - tb;
      return a.arrivalTime.localeCompare(b.arrivalTime);
    })
    .map((row) => {
      const patient = patientById.get(row.patientId);
      const clinical = clinicalById.get(row.patientId);
      const keys = clinical?.orderedLaboratoryKeys ?? [];
      const items = resolvePostPaymentLineItems(keys, priceRows, labCatalog);
      const priced = items.filter((i) => i.price > 0);
      const orderTotal = sumPostPaymentTotal(priced);
      const orderSummary =
        priced.length > 0 ?
          priced
            .slice(0, 3)
            .map((i) => i.name)
            .join(', ') + (priced.length > 3 ? ` +${priced.length - 3}` : '')
        : items
            .slice(0, 3)
            .map((i) => i.name)
            .join(', ');

      return {
        queueId: row.id,
        patientId: row.patientId,
        arrivalTime: row.arrivalTime,
        fullName: patient?.full_name ? String(patient.full_name) : row.fullName,
        cardNumber: patient?.card_number ? String(patient.card_number) : row.patientId,
        diseaseType: row.diseaseType || String(patient?.disease_type ?? ''),
        referredDoctorName: row.referredDoctorName,
        orderCount: keys.length,
        orderTotal,
        orderSummary: orderSummary || `${keys.length} buyurtma`,
        createdAt: row.createdAt,
      };
    });
}
