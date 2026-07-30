import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { applyInpatientRoomPaymentToPatient } from '@/lib/inpatient/mark-room-payment';
import { findPaidInpatientRoomsByGarmonikPatientIds } from '@/lib/kassa/inpatient-room-payment';
import { NextRequest, NextResponse } from 'next/server';

function canAccessHeadNurseApi(session: Awaited<ReturnType<typeof getVerifiedSessionFromRequest>>) {
  if (!session) return false;
  if (session.kind === 'staff' && session.role === 'head_nurse') return true;
  if (session.kind === 'admin' && session.routeGroup === 'admin_only') return true;
  if (session.kind === 'admin' && session.routeGroup === 'head_nursing') return true;
  return false;
}

/** Bemorlar uchun kassada to‘langan statsionar xona turlari */
export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canAccessHeadNurseApi(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }

  const idsParam = request.nextUrl.searchParams.get('patientIds')?.trim() ?? '';
  const patientIds = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (patientIds.length === 0) {
    return NextResponse.json({ payments: {} });
  }

  try {
    const map = await findPaidInpatientRoomsByGarmonikPatientIds(patientIds);
    const payments: Record<
      string,
      {
        roomCapacity: number;
        serviceName: string;
        paidAt: string;
        amountPaid: number;
        balanceDue: number;
      }
    > = {};
    for (const [id, payment] of map) {
      payments[id] = payment;
      try {
        await applyInpatientRoomPaymentToPatient(id, {
          roomCapacity: payment.roomCapacity,
          serviceName: payment.serviceName,
          paidAt: payment.paidAt,
          amountPaid: payment.amountPaid,
          balanceDue: payment.balanceDue,
        });
      } catch (syncErr) {
        console.error('inpatient payment backfill:', id, syncErr);
      }
    }
    return NextResponse.json({ payments });
  } catch (e) {
    console.error('head-nurse room-payments:', e);
    return NextResponse.json({ error: 'Ma’lumot olinmadi' }, { status: 500 });
  }
}
