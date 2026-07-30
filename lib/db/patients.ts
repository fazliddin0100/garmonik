import { query, queryOne } from './query';

export type PatientRow = Record<string, unknown> & {
  id: string;
  clinic_id: string;
  card_number: string;
  first_name: string;
  last_name: string;
  father_name: string;
  full_name: string;
  address: string;
  phone: string;
  disease_type: string;
  jshshir?: string;
  gender: string | null;
  birth_date: string | null;
  age: number | null;
  referred_doctor_user_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function listPatientsByClinic(
  clinicId: string,
): Promise<PatientRow[]> {
  const result = await query<PatientRow>(
    `select * from public.patients
     where clinic_id = $1
     order by created_at desc`,
    [clinicId],
  );
  return result.rows;
}

export async function listPatientsByClinicAndCreator(
  clinicId: string,
  creatorId: string,
): Promise<PatientRow[]> {
  const result = await query<PatientRow>(
    `select id, card_number, full_name, disease_type, gender, created_at, created_by_user_id
     from public.patients
     where clinic_id = $1 and created_by_user_id = $2
     order by created_at desc`,
    [clinicId, creatorId],
  );
  return result.rows;
}

export async function listPatientSummariesByClinic(
  clinicId: string,
): Promise<
  Pick<
    PatientRow,
    'id' | 'card_number' | 'full_name' | 'disease_type' | 'gender'
  >[]
> {
  const result = await query<
    Pick<PatientRow, 'id' | 'card_number' | 'full_name' | 'disease_type' | 'gender'>
  >(
    `select id, card_number, full_name, disease_type, gender
     from public.patients where clinic_id = $1`,
    [clinicId],
  );
  return result.rows;
}

export async function listPatientCardNumbers(clinicId: string): Promise<string[]> {
  const result = await query<{ card_number: string }>(
    `select card_number from public.patients where clinic_id = $1`,
    [clinicId],
  );
  return result.rows.map((r) => r.card_number);
}

export async function findPatientById(
  clinicId: string,
  id: string,
): Promise<PatientRow | null> {
  return queryOne<PatientRow>(
    `select * from public.patients where clinic_id = $1 and id = $2 limit 1`,
    [clinicId, id],
  );
}

/** Kassa qidiruv: karta raqami, telefon yoki ism */
export async function searchPatientsForKassa(
  clinicId: string,
  rawQuery: string,
  limit = 15,
): Promise<PatientRow[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 30);

  if (/^KB-/i.test(q)) {
    const result = await query<PatientRow>(
      `select * from public.patients
       where clinic_id = $1 and card_number ilike $2
       order by created_at desc
       limit $3`,
      [clinicId, `%${q}%`, safeLimit],
    );
    return result.rows;
  }

  const digits = q.replace(/\D/g, '');
  if (digits.length >= 5) {
    const tail = digits.slice(-9);
    const result = await query<PatientRow>(
      `select * from public.patients
       where clinic_id = $1
         and regexp_replace(phone, '\\D', '', 'g') like $2
       order by created_at desc
       limit $3`,
      [clinicId, `%${tail}%`, safeLimit],
    );
    return result.rows;
  }

  const result = await query<PatientRow>(
    `select * from public.patients
     where clinic_id = $1
       and (
         full_name ilike $2
         or card_number ilike $2
         or phone ilike $2
       )
     order by created_at desc
     limit $3`,
    [clinicId, `%${q}%`, safeLimit],
  );
  return result.rows;
}

export async function insertPatient(
  payload: Record<string, unknown>,
): Promise<PatientRow> {
  const keys = Object.keys(payload);
  const values = Object.values(payload);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const row = await queryOne<PatientRow>(
    `insert into public.patients (${keys.join(', ')})
     values (${placeholders})
     returning *`,
    values,
  );
  if (!row) throw new Error('Bemor saqlanmadi');
  return row;
}

export async function updatePatient(
  clinicId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<PatientRow> {
  const keys = Object.keys(patch);
  const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
  const row = await queryOne<PatientRow>(
    `update public.patients
     set ${sets}
     where clinic_id = $1 and id = $2
     returning *`,
    [clinicId, id, ...Object.values(patch)],
  );
  if (!row) throw new Error('Bemor yangilanmadi');
  return row;
}

export async function deletePatient(
  clinicId: string,
  id: string,
): Promise<void> {
  await query(
    `delete from public.patients where clinic_id = $1 and id = $2`,
    [clinicId, id],
  );
}

export function isMissingColumnError(
  error: unknown,
  column: string,
): boolean {
  const msg =
    error instanceof Error ? error.message.toLowerCase()
    : String(error).toLowerCase();
  return msg.includes(column.toLowerCase());
}
