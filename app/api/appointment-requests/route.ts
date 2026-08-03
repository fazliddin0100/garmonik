import {
  createAppointmentRequestForClinic,
  parseAppointmentRequestCreateBody,
} from '@/lib/appointment-requests/create';
import {
  APPOINTMENT_REQUEST_STATUSES,
  type AppointmentRequestStatus,
} from '@/lib/appointment-requests/types';
import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import type { ClinicPortalSession } from '@/lib/auth/session-guards';
import { parseAppointmentRequestIntake } from '@/lib/appointment-requests/intake';
import {
  countAppointmentRequestsByClinic,
  findAppointmentRequestById,
  listAppointmentRequestsByClinic,
  listOnlineQueueAppointmentRequestsByClinic,
  updateAppointmentRequest,
} from '@/lib/db/appointment-requests';
import { findActiveDoctorInClinic } from '@/lib/db/portal-profiles';
import { admitAppointmentRequestToQueue } from '@/lib/server/appointment-request-intake';
import { NextRequest, NextResponse } from 'next/server';

type Session = Awaited<ReturnType<typeof getVerifiedSessionFromRequest>>;

function canManageRequests(session: Session): session is ClinicPortalSession {
  if (!session || session.kind === 'kassa') return false;
  if (session.kind === 'admin') {
    return (
      session.routeGroup === 'admin_only' ||
      session.routeGroup === 'reception' ||
      session.routeGroup === 'office'
    );
  }
  if (session.kind === 'staff') {
    return session.role === 'kabinet';
  }
  return false;
}

function nowIso() {
  return new Date().toISOString();
}

function isValidStatus(s: string): s is AppointmentRequestStatus {
  return (APPOINTMENT_REQUEST_STATUSES as readonly string[]).includes(s);
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canManageRequests(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const statusParam = request.nextUrl.searchParams.get('status')?.trim();
  const status =
    statusParam && isValidStatus(statusParam) ? statusParam : undefined;

  if (request.nextUrl.searchParams.get('newCountOnly') === '1') {
    try {
      const newCount = await countAppointmentRequestsByClinic(
        session.clinicId,
        'new',
      );
      return NextResponse.json({ newCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'O‘qib bo‘lmadi';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    if (request.nextUrl.searchParams.get('activeOnly') === '1') {
      const items = await listOnlineQueueAppointmentRequestsByClinic(
        session.clinicId,
      );
      return NextResponse.json({ items });
    }

    const items = await listAppointmentRequestsByClinic(session.clinicId, status);
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O‘qib bo‘lmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canManageRequests(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = parseAppointmentRequestCreateBody({
    ...body,
    source: 'walk-in',
  });
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const item = await createAppointmentRequestForClinic(session.clinicId, {
      ...parsed,
      source: 'walk-in',
    });
    return NextResponse.json(
      {
        ok: true,
        item,
        queueNumber: item.queue_number,
        message: `Bemor onlayn navbatga qo‘shildi. Navbat: ${item.queue_number}`,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Saqlanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canManageRequests(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';

  if (!id) {
    return NextResponse.json({ error: 'ID topilmadi' }, { status: 400 });
  }
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: 'Noto‘g‘ri holat' }, { status: 400 });
  }

  try {
    const existing = await findAppointmentRequestById(session.clinicId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Ariza topilmadi' }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      status,
      updated_at: nowIso(),
    };

    if (status === 'received' && !existing.patient_id) {
      const parsed = parseAppointmentRequestIntake(body.intake);
      if ('error' in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const doctorRow = await findActiveDoctorInClinic(
        session.clinicId,
        parsed.referredDoctorUserId,
      );
      if (!doctorRow) {
        return NextResponse.json({ error: 'Shifokor topilmadi' }, { status: 400 });
      }

      const { patientId } = await admitAppointmentRequestToQueue(
        session.clinicId,
        existing,
        parsed,
        doctorRow.display_name,
      );
      patch.patient_id = patientId;
    }

    const item = await updateAppointmentRequest(session.clinicId, id, patch);
    return NextResponse.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Yangilanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
