import { query, queryOne } from './query';

export async function readClinicResourcePayload(
  clinicId: string,
  key: string,
): Promise<unknown | null> {
  const row = await queryOne<{ payload: unknown }>(
    `select payload from public.clinic_json_resources
     where clinic_id = $1 and key = $2
     limit 1`,
    [clinicId, key],
  );
  return row?.payload ?? null;
}

export async function upsertClinicResourcePayload(
  clinicId: string,
  key: string,
  payload: unknown,
): Promise<void> {
  await query(
    `insert into public.clinic_json_resources (clinic_id, key, payload, updated_at)
     values ($1, $2, $3::jsonb, now())
     on conflict (clinic_id, key)
     do update set payload = excluded.payload, updated_at = now()`,
    [clinicId, key, JSON.stringify(payload)],
  );
}
