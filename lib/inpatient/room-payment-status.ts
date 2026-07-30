import type { InpatientRoomCapacity } from '@/lib/kassa/inpatient-room-payment';
import type { PatientRow } from '@/lib/patients/types';

export type RoomPaymentSnapshot = {
  roomCapacity: InpatientRoomCapacity;
  serviceName: string;
  paidAt: string;
  amountPaid: number;
  balanceDue: number;
  fullyPaid: boolean;
};

export function isInpatientRoomInvoiceAccepted(status: string): boolean {
  return status === 'PAID' || status === 'PARTIALLY_PAID';
}

export function isInpatientAwaitingRoomPayment(patient: PatientRow): boolean {
  const req = patient.inpatientAdmissionRequest;
  return !!req && !req.roomPaymentAt;
}

export function getRoomPaymentFromRequest(patient: PatientRow): RoomPaymentSnapshot | null {
  const req = patient.inpatientAdmissionRequest;
  if (!req?.roomPaymentAt || !req.paidRoomCapacity) return null;
  const balanceDue = req.roomPaymentBalanceDue ?? 0;
  return {
    roomCapacity: req.paidRoomCapacity,
    serviceName: req.paidRoomServiceName ?? `${req.paidRoomCapacity} kishilik xona`,
    paidAt: req.roomPaymentAt,
    amountPaid: req.roomPaymentAmountPaid ?? 0,
    balanceDue,
    fullyPaid: balanceDue <= 0,
  };
}

export function formatRoomPaymentBadge(payment: RoomPaymentSnapshot): string {
  if (payment.balanceDue > 0) {
    return `To'landi · Qarz: ${Math.round(payment.balanceDue).toLocaleString('uz-UZ')} so'm`;
  }
  return `To'landi · ${payment.serviceName}`;
}
