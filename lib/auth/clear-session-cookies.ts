import { ADMIN_SESSION_COOKIE, STAFF_SESSION_COOKIE } from '@/lib/auth/constants';
import type { NextResponse } from 'next/server';

/** httpOnly sessiya cookie’larini o‘chirish (logout / sessiya yaroqsiz). */
export function clearAllSessionCookies(res: NextResponse): void {
  res.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(STAFF_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
}

export function clearStaffSessionCookie(res: NextResponse): void {
  res.cookies.set(STAFF_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
}
