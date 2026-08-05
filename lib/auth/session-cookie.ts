import type { NextRequest, NextResponse } from 'next/server';
import { signVerifiedSession } from './session-jwt';
import type { VerifiedSession } from './session-jwt';

export const SESSION_COOKIE_NAME = 'garmonik_session';
/** Cookie muddati JWT bilan bir xil — maksimal 5 soat */
export const SESSION_MAX_AGE_SEC = 5 * 60 * 60;

export function sessionCookieOptions(maxAgeSec = SESSION_MAX_AGE_SEC) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  };
}

export function readSessionTokenFromRequest(
  request: NextRequest,
): string | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  return token || null;
}

export async function attachSessionCookie(
  response: NextResponse,
  session: VerifiedSession,
): Promise<NextResponse> {
  const token = await signVerifiedSession(session);
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(SESSION_MAX_AGE_SEC),
  );
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
