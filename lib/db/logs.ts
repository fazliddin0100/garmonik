import { query } from './query';

type LogFilters = {
  clinicId: string;
  from?: string | null;
  to?: string | null;
  actorKind?: string;
  ip?: string;
  limit: number;
};

function buildFilterSql(
  filters: LogFilters,
): { sql: string; params: unknown[] } {
  const parts: string[] = [`clinic_id = $1`];
  const params: unknown[] = [filters.clinicId];
  let idx = 1;

  if (filters.from) {
    idx += 1;
    parts.push(`created_at >= $${idx}`);
    params.push(filters.from);
  }
  if (filters.to) {
    idx += 1;
    parts.push(`created_at <= $${idx}`);
    params.push(filters.to);
  }
  if (filters.actorKind) {
    idx += 1;
    parts.push(`actor_kind = $${idx}`);
    params.push(filters.actorKind);
  }
  if (filters.ip) {
    idx += 1;
    parts.push(`ip = $${idx}`);
    params.push(filters.ip);
  }

  return { sql: parts.join(' and '), params };
}

function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(row);
  const placeholders = keys
    .map((k, i) => (k === 'meta' ? `$${i + 1}::jsonb` : `$${i + 1}`))
    .join(', ');
  const values = keys.map((k) =>
    k === 'meta' ? JSON.stringify(row[k] ?? {}) : row[k],
  );
  return query(
    `insert into public.${table} (${keys.join(', ')}) values (${placeholders})`,
    values,
  ).then(() => undefined);
}

export async function insertSecurityEventLog(
  row: Record<string, unknown>,
): Promise<void> {
  await insertRow('security_event_logs', row);
}

export async function insertAccessAuditLog(
  row: Record<string, unknown>,
): Promise<void> {
  await insertRow('access_audit_logs', row);
}

export async function listSecurityEventLogs(
  filters: LogFilters,
): Promise<Record<string, unknown>[]> {
  const { sql, params } = buildFilterSql(filters);
  const limitIdx = params.length + 1;
  const result = await query<Record<string, unknown>>(
    `select * from public.security_event_logs
     where ${sql}
     order by created_at desc
     limit $${limitIdx}`,
    [...params, filters.limit],
  );
  return result.rows;
}

export async function listAccessAuditLogs(
  filters: LogFilters,
): Promise<Record<string, unknown>[]> {
  const { sql, params } = buildFilterSql(filters);
  const limitIdx = params.length + 1;
  const result = await query<Record<string, unknown>>(
    `select * from public.access_audit_logs
     where ${sql}
     order by created_at desc
     limit $${limitIdx}`,
    [...params, filters.limit],
  );
  return result.rows;
}
