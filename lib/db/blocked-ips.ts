import { query, queryOne } from './query';

export type BlockedIpRow = {
  id: string;
  clinic_id: string;
  ip: string;
  reason: string;
  created_by_user_id: string | null;
  created_by_login: string;
  created_at: string;
};

export async function isIpBlocked(
  clinicId: string,
  ip: string,
): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `select id from public.blocked_ips
     where clinic_id = $1 and ip = $2 limit 1`,
    [clinicId, ip],
  );
  return Boolean(row);
}

export async function listBlockedIps(clinicId: string): Promise<BlockedIpRow[]> {
  const result = await query<BlockedIpRow>(
    `select * from public.blocked_ips
     where clinic_id = $1
     order by created_at desc`,
    [clinicId],
  );
  return result.rows;
}

export async function upsertBlockedIp(input: {
  clinicId: string;
  ip: string;
  reason: string;
  createdByUserId: string;
  createdByLogin: string;
}): Promise<void> {
  await query(
    `insert into public.blocked_ips
       (clinic_id, ip, reason, created_by_user_id, created_by_login)
     values ($1, $2, $3, $4, $5)
     on conflict (clinic_id, ip)
     do update set
       reason = excluded.reason,
       created_by_user_id = excluded.created_by_user_id,
       created_by_login = excluded.created_by_login`,
    [
      input.clinicId,
      input.ip,
      input.reason,
      input.createdByUserId,
      input.createdByLogin,
    ],
  );
}

export async function deleteBlockedIp(
  clinicId: string,
  ip: string,
): Promise<void> {
  await query(
    `delete from public.blocked_ips where clinic_id = $1 and ip = $2`,
    [clinicId, ip],
  );
}
