/**
 * Login / parol-tiklash uchun in-memory urinish cheklovi.
 * Bitta jarayon (PM2/Node) ichida ishlaydi — kassa lockout bilan bir xil siyosat.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

type Bucket = {
  fails: number;
  lockedUntil: number;
};

const buckets = new Map<string, Bucket>();

function now(): number {
  return Date.now();
}

function pruneIfStale(key: string, bucket: Bucket): void {
  if (bucket.lockedUntil > 0 && bucket.lockedUntil <= now() && bucket.fails === 0) {
    buckets.delete(key);
  }
}

export type AuthRateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number; error: string };

export function checkAuthRateLimit(key: string): AuthRateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket) return { ok: true };

  if (bucket.lockedUntil > now()) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.lockedUntil - now()) / 1000),
    );
    return {
      ok: false,
      retryAfterSec,
      error: `Ko‘p marta noto‘g‘ri urinish. ${Math.ceil(retryAfterSec / 60)} daqiqadan keyin qayta urinib ko‘ring`,
    };
  }

  if (bucket.lockedUntil > 0 && bucket.lockedUntil <= now()) {
    buckets.delete(key);
  }

  return { ok: true };
}

/** Noto‘g‘ri urinish — 5-dan keyin 15 daqiqa blok. */
export function recordAuthFailure(key: string): AuthRateLimitResult {
  const existing = buckets.get(key);
  const bucket: Bucket = existing ?? { fails: 0, lockedUntil: 0 };

  if (bucket.lockedUntil > now()) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((bucket.lockedUntil - now()) / 1000),
    );
    return {
      ok: false,
      retryAfterSec,
      error: `Ko‘p marta noto‘g‘ri urinish. ${Math.ceil(retryAfterSec / 60)} daqiqadan keyin qayta urinib ko‘ring`,
    };
  }

  bucket.fails += 1;
  if (bucket.fails >= MAX_FAILED_ATTEMPTS) {
    bucket.lockedUntil = now() + LOCKOUT_MS;
    bucket.fails = 0;
    buckets.set(key, bucket);
    return {
      ok: false,
      retryAfterSec: Math.ceil(LOCKOUT_MS / 1000),
      error: `5 marta noto'g'ri urinish. Hisob ${Math.ceil(LOCKOUT_MS / 60000)} daqiqaga bloklandi`,
    };
  }

  buckets.set(key, bucket);
  pruneIfStale(key, bucket);
  return { ok: true };
}

export function clearAuthRateLimit(key: string): void {
  buckets.delete(key);
}

export function authRateLimitKey(
  scope: string,
  loginNorm: string,
  ip: string,
): string {
  const login = loginNorm.trim().toLowerCase() || '-';
  const ipPart = ip.trim() || 'unknown';
  return `${scope}:${login}:${ipPart}`;
}
