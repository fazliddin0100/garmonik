import { readSessionTokenFromRequest } from '@/lib/auth/session-cookie';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import type { NextRequest } from 'next/server';
import { loadVerifiedSessionFromUserId } from './portal-session';
import type { VerifiedSession } from './session-jwt';

export { sessionCookieOptions } from '@/lib/auth/session-cookie';

export async function getVerifiedSessionFromRequest(
  req: NextRequest,
  opts?: { fresh?: boolean },
): Promise<VerifiedSession | null> {
  const token = readSessionTokenFromRequest(req);
  if (!token) return null;

  const fromJwt = await verifySessionToken(token);
  if (!fromJwt) return null;

  if (opts?.fresh) {
    const fresh = await loadVerifiedSessionFromUserId(fromJwt.id);
    return fresh ?? null;
  }

  return fromJwt;
}

export async function getAdminSessionFromRequest(
  req: NextRequest,
): Promise<Extract<VerifiedSession, { kind: 'admin' }> | null> {
  const s = await getVerifiedSessionFromRequest(req, { fresh: true });
  if (!s || s.kind !== 'admin') return null;
  return s;
}
