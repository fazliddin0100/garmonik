import {
  invalidatePasswordResetChallenge,
  normalizeResetLogin,
  takePasswordResetChallenge,
} from '@/lib/auth/password-reset-store';
import { updatePortalAuthPassword } from '@/lib/auth/portal-session';
import { findUserForPasswordReset } from '@/lib/db/portal-profiles';
import {
  authRateLimitKey,
  checkAuthRateLimit,
  clearAuthRateLimit,
  recordAuthFailure,
} from '@/lib/server/auth-rate-limit';
import { clientIpFromRequest } from '@/lib/server/security-log';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawLogin = typeof body.login === 'string' ? body.login.trim() : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!rawLogin || !code || !newPassword) {
      return NextResponse.json(
        { error: 'Login, kod va yangi parol kiritilishi kerak' },
        { status: 400 },
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" },
        { status: 400 },
      );
    }

    const loginNorm = normalizeResetLogin(rawLogin);
    const rateKey = authRateLimitKey(
      'reset-password',
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

    const adminCandidate = await findUserForPasswordReset(loginNorm, 'admin');
    const staffCandidate =
      adminCandidate ? null : await findUserForPasswordReset(loginNorm, 'staff');
    const candidate = adminCandidate ?? staffCandidate;
    if (!candidate) {
      const fail = recordAuthFailure(rateKey);
      return NextResponse.json(
        { error: fail.ok ? 'Foydalanuvchi topilmadi' : fail.error },
        { status: fail.ok ? 404 : 429 },
      );
    }

    const accountKind = await takePasswordResetChallenge(
      candidate.clinicId,
      loginNorm,
      code,
    );
    if (!accountKind) {
      const fail = recordAuthFailure(rateKey);
      if (!fail.ok) {
        await invalidatePasswordResetChallenge(candidate.clinicId, loginNorm);
        return NextResponse.json(
          { error: fail.error },
          {
            status: 429,
            headers: { 'Retry-After': String(fail.retryAfterSec) },
          },
        );
      }
      return NextResponse.json(
        { error: "Kod noto'g'ri yoki muddati o'tgan" },
        { status: 400 },
      );
    }
    if ((accountKind === 'admin') !== Boolean(adminCandidate)) {
      const fail = recordAuthFailure(rateKey);
      if (!fail.ok) {
        await invalidatePasswordResetChallenge(candidate.clinicId, loginNorm);
      }
      return NextResponse.json(
        { error: "Kod noto'g'ri yoki muddati o'tgan" },
        { status: fail.ok ? 400 : 429 },
      );
    }

    clearAuthRateLimit(rateKey);
    await updatePortalAuthPassword(candidate.userId, newPassword);

    return NextResponse.json({
      ok: true,
      message: 'Parol muvaffaqiyatli yangilandi',
    });
  } catch (e) {
    console.error('reset-password:', e);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
