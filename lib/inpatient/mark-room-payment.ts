import 'server-only';

import {
  readClinicResourcePayload,
  upsertClinicResourcePayload,
} from '@/lib/db/clinic-json-resources';
import {
  parseInpatientRoomCapacityFromServiceName,
  type InpatientRoomCapacity,
} from '@/lib/kassa/inpatient-room-payment';
import { isInpatientRoomInvoiceAccepted } from '@/lib/inpatient/room-payment-status';
import { prisma } from '@/lib/kassa/prisma';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import { getDefaultClinicId } from '@/lib/server/default-clinic';

export { getRoomPaymentFromRequest, isInpatientAwaitingRoomPayment } from '@/lib/inpatient/room-payment-status';

export async function applyInpatientRoomPaymentToPatient(
  garmonikPatientId: string,
  payment: {
    roomCapacity: InpatientRoomCapacity;
    serviceName: string;
    paidAt: string;
    amountPaid: number;
    balanceDue: number;
  },
): Promise<void> {
  const clinicId = await getDefaultClinicId();
  const payload = await readClinicResourcePayload(clinicId, 'patients');
  if (!Array.isArray(payload)) return;

  let changed = false;
  const updated = payload.map((item) => {
    const row = normalizePatientRow(item);
    if (!row || row.id !== garmonikPatientId) return item;
    const req = row.inpatientAdmissionRequest;
    if (!req) return item;

    const nextAmountPaid = payment.amountPaid;
    const nextBalanceDue = payment.balanceDue;
    const prevBalance = req.roomPaymentBalanceDue ?? null;

    if (
      req.roomPaymentAt &&
      req.paidRoomCapacity === payment.roomCapacity &&
      req.roomPaymentAmountPaid === nextAmountPaid &&
      prevBalance === nextBalanceDue
    ) {
      return item;
    }

    changed = true;
    return {
      ...row,
      inpatientAdmissionRequest: {
        ...req,
        roomPaymentAt: req.roomPaymentAt ?? payment.paidAt,
        paidRoomCapacity: payment.roomCapacity,
        paidRoomServiceName: payment.serviceName,
        roomPaymentAmountPaid: nextAmountPaid,
        roomPaymentBalanceDue: nextBalanceDue,
      },
    };
  });

  if (changed) {
    await upsertClinicResourcePayload(clinicId, 'patients', updated);
  }
}

/** Chek yaratilganda yoki qarz yopilganda statsionar xona to‘lovini yotqizish so‘roviga bog‘lash */
export async function markInpatientRoomPaidFromInvoice(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      patient: true,
      items: { include: { service: true } },
    },
  });
  if (!invoice) return;
  if (!isInpatientRoomInvoiceAccepted(invoice.status)) return;

  const roomItem = invoice.items.find((item) =>
    parseInpatientRoomCapacityFromServiceName(item.service.name),
  );
  if (!roomItem) return;

  const garmonikId = invoice.patient.garmonikPatientId;
  if (!garmonikId) return;

  const cap = parseInpatientRoomCapacityFromServiceName(roomItem.service.name);
  if (!cap) return;

  await applyInpatientRoomPaymentToPatient(garmonikId, {
    roomCapacity: cap,
    serviceName: roomItem.service.name,
    paidAt: invoice.createdAt.toISOString(),
    amountPaid: Number(invoice.amountPaid),
    balanceDue: Number(invoice.balanceDue),
  });
}

export async function syncInpatientRoomPaymentAfterInvoice(
  _garmonikPatientId: string | null | undefined,
  invoiceId: string,
): Promise<void> {
  await markInpatientRoomPaidFromInvoice(invoiceId);
}
