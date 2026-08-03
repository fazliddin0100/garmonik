import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { clearSessionCookie } from '@/lib/auth/session-cookie';
import { logSecurityEvent } from '@/lib/server/security-log';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  await logSecurityEvent({
    request,
    session,
    eventType: 'logout',
    target: '/api/auth/logout',
  });
  return res;
}
