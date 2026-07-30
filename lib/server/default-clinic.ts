import { queryOne } from '@/lib/db/query';

let cacheId: string | null = null;

/** Birinchi klinika (uuid) — barcha JSON resurslar shu bilan bog‘lanadi */
export async function getDefaultClinicId(): Promise<string> {
  if (cacheId) return cacheId;

  const fromEnv = process.env.DEFAULT_CLINIC_ID?.trim();
  if (fromEnv) {
    cacheId = fromEnv;
    return fromEnv;
  }

  const data = await queryOne<{ id: string }>(
    `select id from public.clinics order by created_at asc limit 1`,
  );
  if (!data?.id) {
    throw new Error(
      'Klinika topilmadi. `npm run db:migrate` va `npm run db:seed` ni bajaring.',
    );
  }
  cacheId = data.id;
  return cacheId;
}

/** Eski nom (Mongo ObjectId o‘rniga uuid string) */
export async function getDefaultClinicObjectId(): Promise<string> {
  return getDefaultClinicId();
}
