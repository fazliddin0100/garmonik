import {
  createAppointmentRequestForClinic,
  parseAppointmentRequestCreateBody,
} from '@/lib/appointment-requests/create';
import { APPOINTMENT_REQUEST_STATUSES } from '@/lib/appointment-requests/types';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { blockedIpResponse, isRequestIpBlocked } from '@/lib/server/ip-block';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (await isRequestIpBlocked(request)) {
    return blockedIpResponse();
  }

  const body = await request.json().catch(() => ({}));
  const parsed = parseAppointmentRequestCreateBody({
    ...body,
    source: 'instagram',
  });
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const clinicId = await getDefaultClinicId();
    const row = await createAppointmentRequestForClinic(clinicId, {
      ...parsed,
      source: 'instagram',
    });

    return NextResponse.json(
      {
        ok: true,
        queueNumber: row.queue_number,
        message: `Arizangiz qabul qilindi. Navbat raqamingiz: ${row.queue_number}`,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Saqlanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    fields: [
      'firstName',
      'lastName',
      'phone',
      'address',
      'diseaseType',
      'preferredTime',
    ],
    statuses: APPOINTMENT_REQUEST_STATUSES,
  });
}
