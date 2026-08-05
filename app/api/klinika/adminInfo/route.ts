import { adminRoleLabelToJwtRouteGroup } from '@/lib/admins/portal-routes';
import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  createPortalAuthUser,
  deletePortalAuthUser,
} from '@/lib/auth/portal-session';
import {
  adminLoginExists,
  insertPortalProfile,
} from '@/lib/db/portal-profiles';
import { queryOne } from '@/lib/db/query';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function bootstrapTokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Birinchi admin bootstrap yoki mavjud admin_only tomonidan yaratish.
 * Auth’siz ochiq qolmaydi: count=0 bo‘lsa BOOTSTRAP_SETUP_TOKEN majburiy.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const adminName =
      typeof body.adminName === 'string' ? body.adminName.trim() : '';
    const adminLogin =
      typeof body.adminLogin === 'string' ? body.adminLogin.trim() : '';
    const adminPassword =
      typeof body.adminPassword === 'string' ? body.adminPassword : '';
    const clinicId =
      typeof body.clinicId === 'string' ? body.clinicId.trim() : '';
    const bodyBootstrap =
      typeof body.bootstrapToken === 'string' ? body.bootstrapToken.trim() : '';
    const headerBootstrap =
      request.headers.get('x-bootstrap-token')?.trim() || '';

    if (!adminName || !adminLogin || !adminPassword || !clinicId) {
      return NextResponse.json(
        { error: 'Barcha maydonlar kiritilishi kerak' },
        { status: 400 },
      );
    }

    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" },
        { status: 400 },
      );
    }

    const adminCount = await queryOne<{ n: string }>(
      `select count(*)::text as n
       from public.portal_user_profiles
       where account_kind = 'admin'`,
    );
    const count = Number.parseInt(adminCount?.n ?? '0', 10);

    if (count > 0) {
      const session = await getAdminSessionFromRequest(request);
      if (!session || session.routeGroup !== 'admin_only') {
        return NextResponse.json(
          { error: 'Admin yaratish uchun klinika direktori sessiyasi kerak' },
          { status: 403 },
        );
      }
    } else {
      const expected = process.env.BOOTSTRAP_SETUP_TOKEN?.trim() || '';
      const provided = bodyBootstrap || headerBootstrap;
      if (!expected || !bootstrapTokenMatches(provided, expected)) {
        return NextResponse.json(
          {
            error:
              'Birinchi admin uchun BOOTSTRAP_SETUP_TOKEN talab qilinadi (x-bootstrap-token yoki body.bootstrapToken)',
          },
          { status: 403 },
        );
      }
    }

    const defaultClinic = await getDefaultClinicId();
    if (String(clinicId) !== String(defaultClinic)) {
      return NextResponse.json({ error: 'Klinika topilmadi' }, { status: 404 });
    }

    const loginNorm = String(adminLogin).trim().toLowerCase();
    const emailNorm = loginNorm.includes('@')
      ? loginNorm
      : `${loginNorm}@garmonik.admin.local`;

    if (await adminLoginExists(loginNorm, emailNorm)) {
      return NextResponse.json(
        { error: 'Bu login allaqachon band' },
        { status: 409 },
      );
    }

    const rg = adminRoleLabelToJwtRouteGroup('Klinika direktori', loginNorm);

    const created = await createPortalAuthUser({
      email: emailNorm,
      password: adminPassword,
    });

    try {
      await insertPortalProfile({
        user_id: created.id,
        clinic_id: defaultClinic,
        account_kind: 'admin',
        auth_email: emailNorm,
        staff_login: loginNorm,
        display_name: adminName,
        role_label: 'Klinika direktori',
        admin_route_group: rg,
        is_active: true,
      });
    } catch (insErr) {
      await deletePortalAuthUser(created.id);
      const message =
        insErr instanceof Error ? insErr.message : 'Profil yaratilmadi';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: 'Admin muvaffaqiyatli yaratildi!',
        adminId: created.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Admin registration error:', error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
