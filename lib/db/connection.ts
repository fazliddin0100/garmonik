import type { ConnectionConfig } from 'pg';

/** Local Postgres uchun SSL o‘chiriladi; remote (VPS/Supabase) uchun yoqiladi. */
export function getSslConfigForDatabaseUrl(url: string): ConnectionConfig['ssl'] {
  const forced = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (forced === 'false' || forced === '0' || forced === 'no') return undefined;
  if (forced === 'true' || forced === '1' || forced === 'yes') {
    return { rejectUnauthorized: false };
  }

  try {
    const normalized = url.replace(/^postgresql:/, 'http:').replace(/^postgres:/, 'http:');
    const host = new URL(normalized).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === 'db') {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return { rejectUnauthorized: false };
}
