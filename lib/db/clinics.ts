import { query, queryOne } from './query';

export type ClinicRow = {
  id: string;
  name: string;
  logo_file_path: string | null;
  created_at: string;
  updated_at: string;
};

export async function findClinicByName(name: string): Promise<ClinicRow | null> {
  return queryOne<ClinicRow>(
    `select id, name, logo_file_path, created_at, updated_at
     from public.clinics where lower(name) = lower($1) limit 1`,
    [name.trim()],
  );
}

export async function createClinic(name: string): Promise<ClinicRow> {
  const row = await queryOne<ClinicRow>(
    `insert into public.clinics (name) values ($1)
     returning id, name, logo_file_path, created_at, updated_at`,
    [name.trim()],
  );
  if (!row) throw new Error('Klinika yaratilmadi');
  return row;
}

export async function updateClinicLogo(
  clinicId: string,
  logoPath: string,
): Promise<void> {
  await query(
    `update public.clinics
     set logo_file_path = $2, updated_at = now()
     where id = $1`,
    [clinicId, logoPath],
  );
}
