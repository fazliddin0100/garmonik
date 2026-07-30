import { listPatientsByClinic } from '@/lib/db/patients';

import {

  readClinicResourcePayload,

  upsertClinicResourcePayload,

} from '@/lib/db/clinic-json-resources';

import { readClinicQueueRows, writeClinicQueueRows } from '@/lib/queue/clinic-queue-store';

import { prisma } from '@/lib/kassa/prisma';

import { ensureKassaPatientForGarmonik } from '@/lib/kassa/patient-bridge';

import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';

import type { PatientRow } from '@/lib/patients/types';

import {

  formatPostPaymentLabel,

  resolvePostPaymentLineItems,

  sumPostPaymentTotal,

  type PostPaymentLineItem,

} from '@/lib/queue/post-payment-items';

import {

  isVisibleToKassaPayment,

  isWaitingPayment,

  isWaitingPostPayment,

  normalizeQueueRow,

  type QueueRow,

} from '@/lib/queue/types';

import type { LabCategory } from '@/lib/laboratory/catalog-types';

import { SERVICE_PRICE_ROWS, type ServicePriceRow } from '@/lib/services/pricing-data';

import { getDefaultClinicId } from '@/lib/server/default-clinic';

import { isInpatientAwaitingRoomPayment } from '@/lib/inpatient/room-payment-status';



export type KassaPaymentKind = 'initial' | 'post_doctor' | 'inpatient_room';



export type KassaPaymentQueueItem = {

  queueId: string;

  position: number;

  arrivalTime: string;

  fullName: string;

  cardNumber: string;

  phone: string;

  diseaseType: string;

  referredDoctorName?: string;

  referredDoctorUserId?: string;

  garmonikPatientId: string;

  kassaPatientId: string;

  paymentLabel: string;

  paymentKind: KassaPaymentKind;

  postPaymentItems?: PostPaymentLineItem[];

  postPaymentTotal?: number;

};



const DEFAULT_CONSULTATION_SERVICE = 'Terapevt konsultatsiya';



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



export async function listKassaPaymentQueue(): Promise<KassaPaymentQueueItem[]> {

  const clinicId = await getDefaultClinicId();

  const [queueRows, patients, clinicalById, priceRows, labCatalog] = await Promise.all([

    readQueueRows(clinicId),

    listPatientsByClinic(clinicId),

    readClinicalPatients(clinicId),

    readPriceRows(clinicId),

    readLabCatalog(clinicId),

  ]);



  const patientById = new Map(patients.map((p) => [String(p.id), p]));

  const waiting = queueRows

    .filter(isVisibleToKassaPayment)

    .sort((a, b) => {

      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;

      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;

      if (ta !== tb) return ta - tb;

      return a.arrivalTime.localeCompare(b.arrivalTime);

    });



  const items: KassaPaymentQueueItem[] = [];



  for (let i = 0; i < waiting.length; i++) {

    const row = waiting[i];

    const clinicPatient = patientById.get(row.patientId);

    if (!clinicPatient) continue;



    const kassaPatient = await ensureKassaPatientForGarmonik({

      id: String(clinicPatient.id),

      full_name: String(clinicPatient.full_name),

      phone: String(clinicPatient.phone ?? ''),

      birth_date: clinicPatient.birth_date ? String(clinicPatient.birth_date) : null,

    });



    const diseaseType = row.diseaseType?.trim() || 'Umumiy ko‘rik';

    const postPayment = isWaitingPostPayment(row);

    const clinical = clinicalById.get(row.patientId);

    const orderedKeys = clinical?.orderedLaboratoryKeys ?? [];

    const postItems =

      postPayment && orderedKeys.length > 0 ?

        resolvePostPaymentLineItems(orderedKeys, priceRows, labCatalog)

      : [];

    const postTotal = sumPostPaymentTotal(postItems);



    items.push({

      queueId: row.id,

      position: i + 1,

      arrivalTime: row.arrivalTime,

      fullName: row.fullName,

      cardNumber: String(clinicPatient.card_number),

      phone: String(clinicPatient.phone ?? ''),

      diseaseType,

      referredDoctorName: row.referredDoctorName,

      referredDoctorUserId: row.referredDoctorUserId,

      garmonikPatientId: String(clinicPatient.id),

      kassaPatientId: kassaPatient.id,

      paymentKind: postPayment ? 'post_doctor' : 'initial',

      paymentLabel:

        postPayment ?

          formatPostPaymentLabel(postItems)

        : `Konsultatsiya — ${diseaseType}`,

      ...(postItems.length > 0 ? { postPaymentItems: postItems, postPaymentTotal: postTotal } : {}),

    });

  }

  let position = items.length;

  for (const clinical of clinicalById.values()) {
    if (!isInpatientAwaitingRoomPayment(clinical)) continue;

    const clinicPatient = patientById.get(clinical.id);
    if (!clinicPatient) continue;

    const req = clinical.inpatientAdmissionRequest!;

    const kassaPatient = await ensureKassaPatientForGarmonik({
      id: String(clinicPatient.id),
      full_name: String(clinicPatient.full_name),
      phone: String(clinicPatient.phone ?? ''),
      birth_date: clinicPatient.birth_date ? String(clinicPatient.birth_date) : null,
    });

    position += 1;
    items.push({
      queueId: `inpatient:${clinical.id}`,
      position,
      arrivalTime: new Date(req.requestedAt).toLocaleTimeString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      fullName: clinical.fullName,
      cardNumber: String(clinicPatient.card_number),
      phone: String(clinicPatient.phone ?? ''),
      diseaseType: clinical.diseaseType?.trim() || 'Statsionar yotqizish',
      referredDoctorName: req.requestedByName,
      garmonikPatientId: String(clinicPatient.id),
      kassaPatientId: kassaPatient.id,
      paymentKind: 'inpatient_room',
      paymentLabel: 'Statsionar xona to‘lovi — klinikaga yotqizish',
    });
  }

  return items;

}



/** @deprecated markPatientAfterKassaPayment ishlating */

export async function markPatientReadyForDoctor(garmonikPatientId: string): Promise<void> {

  await markPatientAfterKassaPayment(garmonikPatientId);

}



export async function markPatientAfterKassaPayment(garmonikPatientId: string): Promise<void> {

  const clinicId = await getDefaultClinicId();

  const rows = await readQueueRows(clinicId);

  if (rows.length === 0) return;



  let changed = false;

  const updated = rows.map((row) => {

    if (row.patientId !== garmonikPatientId) return row;

    if (isWaitingPayment(row)) {

      changed = true;

      return { ...row, status: 'ready_for_doctor' as const };

    }

    if (isWaitingPostPayment(row)) {

      changed = true;

      return { ...row, status: 'ready_for_laboratory' as const };

    }

    return row;

  });



  if (!changed) return;

  await writeClinicQueueRows(clinicId, updated);

}



export async function getDefaultConsultationServiceId(): Promise<string | null> {

  const service = await prisma.service.findFirst({

    where: {

      name: DEFAULT_CONSULTATION_SERVICE,

      isActive: true,

    },

    select: { id: true },

  });

  return service?.id ?? null;

}



export { DEFAULT_CONSULTATION_SERVICE };


