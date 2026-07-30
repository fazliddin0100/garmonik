import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  updatePortalAuthPassword,
  verifyPortalAuthPassword,
} from '@/lib/auth/portal-session';
import { findAdminProfileByLogin } from '@/lib/db/portal-profiles';
import { NextRequest, NextResponse } from 'next/server';

/** Admin panel parolini PostgreSQL `app_users` da yangilash. */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Sessiya talab qilinadi' }, { status: 401 });
    }

    const body = await request.json();
    const loginRaw = typeof body.login === 'string' ? body.login.trim() : '';
    const currentPassword =
      typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword =
      typeof body.newPassword === 'string' ? body.newPassword : '';

    if (!loginRaw || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Login, joriy va yangi parol kiritilishi kerak' },
        { status: 400 },
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak" },
        { status: 400 },
      );
    }

    const norm = loginRaw.toLowerCase();
    const profile = await findAdminProfileByLogin(norm);
    if (!profile) {
      return NextResponse.json(
        {
          error:
            'Bu login bilan admin profili topilmadi. Login tizimda yaratilgan admin bilan mos kelishi kerak.',
        },
        { status: 404 },
      );
    }

    const ok = await verifyPortalAuthPassword(profile.user_id, currentPassword);
    if (!ok) {
      return NextResponse.json(
        { error: 'Joriy parol noto‘g‘ri' },
        { status: 400 },
      );
    }

    await updatePortalAuthPassword(profile.user_id, newPassword);

    return NextResponse.json({
      ok: true,
      message: 'Parol yangilandi',
    });
  } catch (e) {
    console.error('sync-mongo-password:', e);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
