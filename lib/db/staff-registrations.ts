import { query, queryOne } from './query';

export async function findStaffRegistrationByLogin(
  login: string,
): Promise<{ id: string } | null> {
  return queryOne<{ id: string }>(
    `select id from public.clinic_staff_registrations
     where login = $1 limit 1`,
    [login],
  );
}

export async function insertStaffRegistration(
  row: Record<string, unknown>,
): Promise<{ id: string }> {
  const keys = Object.keys(row);
  const values = Object.values(row);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const created = await queryOne<{ id: string }>(
    `insert into public.clinic_staff_registrations (${keys.join(', ')})
     values (${placeholders})
     returning id`,
    values,
  );
  if (!created) throw new Error('Ro‘yxatdan o‘tish saqlanmadi');
  return created;
}
