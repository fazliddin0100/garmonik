import type {
  AppointmentRequestRow,
  AppointmentRequestStatus,
} from '@/lib/appointment-requests/types';
import { query, queryOne } from './query';

export type { AppointmentRequestRow };

export async function listAppointmentRequestQueueNumbers(
  clinicId: string,
): Promise<string[]> {
  const result = await query<{ queue_number: string }>(
    `select queue_number from public.appointment_requests where clinic_id = $1`,
    [clinicId],
  );
  return result.rows.map((r) => r.queue_number);
}

export async function insertAppointmentRequest(
  payload: Record<string, unknown>,
): Promise<AppointmentRequestRow> {
  const keys = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const row = await queryOne<AppointmentRequestRow>(
    `insert into public.appointment_requests (${keys.join(', ')})
     values (${placeholders})
     returning *`,
    values,
  );
  if (!row) throw new Error('Ariza saqlanmadi');
  return row;
}

export async function countAppointmentRequestsByClinic(
  clinicId: string,
  status?: AppointmentRequestStatus,
): Promise<number> {
  if (status) {
    const row = await queryOne<{ count: string }>(
      `select count(*)::text as count
       from public.appointment_requests
       where clinic_id = $1 and status = $2`,
      [clinicId, status],
    );
    return Number.parseInt(row?.count ?? '0', 10) || 0;
  }

  const row = await queryOne<{ count: string }>(
    `select count(*)::text as count
     from public.appointment_requests
     where clinic_id = $1`,
    [clinicId],
  );
  return Number.parseInt(row?.count ?? '0', 10) || 0;
}

export async function listAppointmentRequestsByClinic(
  clinicId: string,
  status?: AppointmentRequestStatus,
): Promise<AppointmentRequestRow[]> {
  if (status) {
    const result = await query<AppointmentRequestRow>(
      `select * from public.appointment_requests
       where clinic_id = $1 and status = $2
       order by created_at desc`,
      [clinicId, status],
    );
    return result.rows;
  }

  const result = await query<AppointmentRequestRow>(
    `select * from public.appointment_requests
     where clinic_id = $1
     order by created_at desc`,
    [clinicId],
  );
  return result.rows;
}

/** Faqat onlayn navbatda turadigan arizalar (yangi va tasdiqlangan) */
export async function listOnlineQueueAppointmentRequestsByClinic(
  clinicId: string,
): Promise<AppointmentRequestRow[]> {
  const result = await query<AppointmentRequestRow>(
    `select * from public.appointment_requests
     where clinic_id = $1 and status in ('new', 'confirmed')
     order by created_at desc`,
    [clinicId],
  );
  return result.rows;
}

export async function findAppointmentRequestById(
  clinicId: string,
  id: string,
): Promise<AppointmentRequestRow | null> {
  return queryOne<AppointmentRequestRow>(
    `select * from public.appointment_requests
     where clinic_id = $1 and id = $2`,
    [clinicId, id],
  );
}

export async function updateAppointmentRequest(
  clinicId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<AppointmentRequestRow> {
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
  const row = await queryOne<AppointmentRequestRow>(
    `update public.appointment_requests
     set ${sets}
     where clinic_id = $1 and id = $2
     returning *`,
    [clinicId, id, ...Object.values(patch)],
  );
  if (!row) throw new Error('Ariza yangilanmadi');
  return row;
}
