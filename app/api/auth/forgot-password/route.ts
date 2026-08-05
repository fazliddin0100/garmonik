import {
  normalizeResetLogin,
  savePasswordResetChallenge,
} from '@/lib/auth/password-reset-store';
import { findUserForPasswordReset } from '@/lib/db/portal-profiles';
import {
  authRateLimitKey,
  checkAuthRateLimit,
  recordAuthFailure,
} from '@/lib/server/auth-rate-limit';
import { clientIpFromRequest } from '@/lib/server/security-log';
import { NextRequest, NextResponse } from 'next/server';

async function findAccountKindForLogin(
  loginNorm: string,
): Promise<{ kind: 'admin' | 'staff'; clinicId: string } | null> {
  const admin = await findUserForPasswordReset(loginNorm, 'admin');
  if (admin) return { kind: 'admin', clinicId: admin.clinicId };
  const staff = await findUserForPasswordReset(loginNorm, 'staff');
  if (staff) return { kind: 'staff', clinicId: staff.clinicId };
  return null;
}

/** 6 xonali kod. Dev muhitda `devCode` qaytariladi. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const raw = typeof body.login === 'string' ? body.login.trim() : '';
    if (!raw) {
      return NextResponse.json(
        { error: 'Login kiritilishi kerak' },
        { status: 400 },
      );
    }

    const loginNorm = normalizeResetLogin(raw);
    const rateKey = authRateLimitKey(
      'forgot-password',
      loginNorm,
      clientIpFromRequest(request),
    );
    const limited = checkAuthRateLimit(rateKey);
    if (!limited.ok) {
      return NextResponse.json(
        { error: limited.error },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSec) },
        },
      );
    }

    const found = await findAccountKindForLogin(loginNorm);

    const generic = {
      ok: true as const,
      message:
        "Agar bu login tizimda mavjud bo'lsa, tasdiqlash kodi yuboriladi.",
    };

    // Har bir so‘rov urinish hisoblanadi (enumeratsiya + spam cheklovi)
    const fail = recordAuthFailure(rateKey);
    if (!fail.ok) {
      return NextResponse.json(
        { error: fail.error },
        {
          status: 429,
          headers: { 'Retry-After': String(fail.retryAfterSec) },
        },
      );
    }

    if (!found) {
      return NextResponse.json(generic);
    }

    const code = await savePasswordResetChallenge(
      found.clinicId,
      loginNorm,
      found.kind,
    );

    if (process.env.NODE_ENV === 'development') {
      console.info('[password-reset] dev code for', loginNorm, ':', code);
    }

    const payload: Record<string, unknown> = { ...generic };
    if (process.env.NODE_ENV === 'development') {
      payload.devCode = code;
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error('forgot-password:', e);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
