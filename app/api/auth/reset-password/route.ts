import {
  normalizeResetLogin,
  takePasswordResetChallenge,
} from '@/lib/auth/password-reset-store';
import { updatePortalAuthPassword } from '@/lib/auth/portal-session';
import { findUserForPasswordReset } from '@/lib/db/portal-profiles';
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
    const adminCandidate = await findUserForPasswordReset(loginNorm, 'admin');
    const staffCandidate =
      adminCandidate ? null : await findUserForPasswordReset(loginNorm, 'staff');
    const candidate = adminCandidate ?? staffCandidate;
    if (!candidate) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi' },
        { status: 404 },
      );
    }

    const accountKind = await takePasswordResetChallenge(
      candidate.clinicId,
      loginNorm,
      code,
    );
    if (!accountKind) {
      return NextResponse.json(
        { error: "Kod noto'g'ri yoki muddati o'tgan" },
        { status: 400 },
      );
    }
    if ((accountKind === 'admin') !== Boolean(adminCandidate)) {
      return NextResponse.json(
        { error: "Kod noto'g'ri yoki muddati o'tgan" },
        { status: 400 },
      );
    }

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
