import { prisma } from '@/lib/kassa/prisma';
import { isInpatientRoomInvoiceAccepted } from '@/lib/inpatient/room-payment-status';

export type InpatientRoomCapacity = 2 | 3 | 4;

export const INPATIENT_ROOM_CAPACITY_LABELS: Record<InpatientRoomCapacity, string> = {
  2: '2 kishilik xona',
  3: '3 kishilik xona',
  4: '4 kishilik xona',
};

export type InpatientRoomPayment = {
  roomCapacity: InpatientRoomCapacity;
  serviceName: string;
  paidAt: string;
  amountPaid: number;
  balanceDue: number;
};

export function parseInpatientRoomCapacityFromServiceName(
  name: string,
): InpatientRoomCapacity | null {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes('2 kishilik')) return 2;
  if (normalized.includes('3 kishilik')) return 3;
  if (normalized.includes('4 kishilik')) return 4;
  return null;
}

/** Kassa chekida qabul qilingan statsionar xona (to‘liq yoki qisman, shu jumladan 0 so‘m + qarz) */
export async function findPaidInpatientRoomsByGarmonikPatientIds(
  garmonikPatientIds: string[],
): Promise<Map<string, InpatientRoomPayment>> {
  const uniqueIds = [...new Set(garmonikPatientIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const kassaPatients = await prisma.patient.findMany({
    where: { garmonikPatientId: { in: uniqueIds } },
    select: { id: true, garmonikPatientId: true },
  });

  const kassaIdToGarmonik = new Map(
    kassaPatients
      .filter((p) => p.garmonikPatientId)
      .map((p) => [p.id, p.garmonikPatientId as string]),
  );
  const kassaIds = [...kassaIdToGarmonik.keys()];
  if (kassaIds.length === 0) return new Map();

  const invoices = await prisma.invoice.findMany({
    where: {
      patientId: { in: kassaIds },
      status: { in: ['PAID', 'PARTIALLY_PAID'] },
    },
    include: {
      items: { include: { service: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const result = new Map<string, InpatientRoomPayment>();
  for (const inv of invoices) {
    if (!isInpatientRoomInvoiceAccepted(inv.status)) continue;
    const garmonikId = kassaIdToGarmonik.get(inv.patientId);
    if (!garmonikId || result.has(garmonikId)) continue;

    for (const item of inv.items) {
      const cap = parseInpatientRoomCapacityFromServiceName(item.service.name);
      if (!cap) continue;
      result.set(garmonikId, {
        roomCapacity: cap,
        serviceName: item.service.name,
        paidAt: inv.createdAt.toISOString(),
        amountPaid: Number(inv.amountPaid),
        balanceDue: Number(inv.balanceDue),
      });
      break;
    }
  }

  return result;
}
