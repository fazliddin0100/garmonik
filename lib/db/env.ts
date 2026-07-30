export function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} topilmadi`);
  return v;
}

export function getDatabaseUrl(): string {
  return requireEnv('DATABASE_URL');
}

export function getJwtSecret(): string {
  const v = process.env.JWT_SECRET?.trim();
  if (!v) throw new Error('JWT_SECRET topilmadi');
  return v;
}

/** Supabase kalitlari yo‘q — doim plain PostgreSQL. */
export function isPlainPostgresMode(): boolean {
  return true;
}
