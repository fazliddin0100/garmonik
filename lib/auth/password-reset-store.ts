/**
 * Parol-tiklash kodlari — PostgreSQL.
 */

import { query, queryOne } from '@/lib/db/query';

export type PasswordResetAccountKind = 'admin' | 'staff';

export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

export function normalizeResetLogin(login: string): string {
  return login.trim().toLowerCase();
}

function sixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function savePasswordResetChallenge(
  clinicId: string,
  loginNorm: string,
  accountKind: PasswordResetAccountKind,
): Promise<string> {
  const code = sixDigitCode();
  await query(
    `delete from public.password_reset_tokens
     where clinic_id = $1 and login_norm = $2`,
    [clinicId, loginNorm],
  );
  await query(
    `insert into public.password_reset_tokens
       (clinic_id, login_norm, code, account_kind, expires_at)
     values ($1, $2, $3, $4, $5)`,
    [
      clinicId,
      loginNorm,
      code,
      accountKind,
      new Date(Date.now() + PASSWORD_RESET_TTL_MS).toISOString(),
    ],
  );
  return code;
}

export async function takePasswordResetChallenge(
  clinicId: string,
  loginNorm: string,
  code: string,
): Promise<PasswordResetAccountKind | null> {
  const now = new Date().toISOString();
  const data = await queryOne<{ id: string; account_kind: PasswordResetAccountKind }>(
    `select id, account_kind
     from public.password_reset_tokens
     where clinic_id = $1
       and login_norm = $2
       and code = $3
       and expires_at > $4
     limit 1`,
    [clinicId, loginNorm, code.trim(), now],
  );
  if (!data) return null;
  await query('delete from public.password_reset_tokens where id = $1', [data.id]);
  return data.account_kind;
}

/** Brute-force dan keyin kodni bekor qilish */
export async function invalidatePasswordResetChallenge(
  clinicId: string,
  loginNorm: string,
): Promise<void> {
  await query(
    `delete from public.password_reset_tokens
     where clinic_id = $1 and login_norm = $2`,
    [clinicId, loginNorm],
  );
}
