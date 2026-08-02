import type { NextRequest } from 'next/server';
import type { VerifiedSession } from './session-jwt';
import { verifySessionToken } from './session-jwt';
import { readSessionTokenFromRequest } from './session-cookie';

export type KassaAccessRole = 'ADMIN' | 'CASHIER';

/** Edge proxy: faqat `garmonik_session` (kind: kassa) */
export async function readKassaAccessFromRequest(
  _request: NextRequest,
  clinicSession: VerifiedSession | null,
): Promise<{ role: KassaAccessRole } | null> {
  if (clinicSession?.kind === 'kassa') {
    return { role: clinicSession.role };
  }
  return null;
}

export async function readClinicSessionFromRequest(
  request: NextRequest,
): Promise<VerifiedSession | null> {
  const token = readSessionTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

export const KASSA_PUBLIC_PATHS = [
  '/kassa/login',
  '/api/kassa/auth/login',
  '/api/kassa/auth/logout',
] as const;

export function isKassaPublicPath(pathname: string): boolean {
  return KASSA_PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function isKassaProtectedPath(pathname: string): boolean {
  return (
    pathname === '/kassa' ||
    pathname.startsWith('/kassa/') ||
    pathname === '/kassir' ||
    pathname.startsWith('/kassir/') ||
    pathname === '/kassa-admin' ||
    pathname.startsWith('/kassa-admin/') ||
    pathname.startsWith('/api/kassa/')
  );
}

export function kassaLoginUrl(request: NextRequest, pathname: string): URL {
  const u = new URL('/auth/login', request.url);
  u.searchParams.set('next', pathname || '/kassa');
  return u;
}
