import type { InpatientRoomPayment } from '@/lib/kassa/inpatient-room-payment';
import {
  formatRoomPaymentBadge,
  getRoomPaymentFromRequest,
  type RoomPaymentSnapshot,
} from '@/lib/inpatient/room-payment-status';
import type { PatientRow } from '@/lib/patients/types';

export type LabResultsStatus = {
  hasOrders: boolean;
  resultCount: number;
  orderCount: number;
  allResultsReady: boolean;
};

export function getLabResultsStatus(patient: PatientRow): LabResultsStatus {
  const orderCount = patient.orderedLaboratoryKeys?.length ?? 0;
  const resultCount =
    patient.laboratoryResults?.filter((r) => r.value.trim().length > 0).length ?? 0;
  return {
    hasOrders: orderCount > 0,
    resultCount,
    orderCount,
    allResultsReady: orderCount > 0 && resultCount > 0,
  };
}

export type AdmissionReadiness = {
  lab: LabResultsStatus;
  roomPayment: {
    paid: boolean;
    roomCapacity: RoomPaymentSnapshot['roomCapacity'] | null;
    serviceName: string | null;
    amountPaid: number;
    balanceDue: number;
    fullyPaid: boolean;
    label: string;
  };
  ready: boolean;
};

function snapshotFromKassaPayment(payment: InpatientRoomPayment): RoomPaymentSnapshot {
  const balanceDue = payment.balanceDue;
  return {
    roomCapacity: payment.roomCapacity,
    serviceName: payment.serviceName,
    paidAt: payment.paidAt,
    amountPaid: payment.amountPaid,
    balanceDue,
    fullyPaid: balanceDue <= 0,
  };
}

export function assessAdmissionReadiness(
  patient: PatientRow,
  roomPayment?: InpatientRoomPayment | null,
): AdmissionReadiness {
  const lab = getLabResultsStatus(patient);
  const fromRequest = getRoomPaymentFromRequest(patient);
  const payment =
    fromRequest ??
    (roomPayment ? snapshotFromKassaPayment(roomPayment) : null);
  const paid = !!payment;
  return {
    lab,
    roomPayment: {
      paid,
      roomCapacity: payment?.roomCapacity ?? null,
      serviceName: payment?.serviceName ?? null,
      amountPaid: payment?.amountPaid ?? 0,
      balanceDue: payment?.balanceDue ?? 0,
      fullyPaid: payment?.fullyPaid ?? false,
      label: payment ? formatRoomPaymentBadge(payment) : 'Xona to‘lovi yo‘q',
    },
    ready: lab.allResultsReady && paid,
  };
}
