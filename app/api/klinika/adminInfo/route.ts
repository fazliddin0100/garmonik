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
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const adminCount = await queryOne<{ n: string }>(
      `select count(*)::text as n
       from public.portal_user_profiles
       where account_kind = 'admin'`,
    );
    const count = Number.parseInt(adminCount?.n ?? '0', 10);

    if (count > 0) {
      const session = await getAdminSessionFromRequest(request);
      if (!session) {
        return NextResponse.json(
          { error: 'Admin yaratish uchun administrator sessiyasi kerak' },
          { status: 401 },
        );
      }
    }

    const { adminName, adminLogin, adminPassword, clinicId } =
      await request.json();

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

    const defaultClinic = await getDefaultClinicId();
    if (String(clinicId) !== String(defaultClinic)) {
      return NextResponse.json({ error: 'Klinika topilmadi' }, { status: 404 });
    }

    const loginNorm = String(adminLogin).trim().toLowerCase();
    const emailNorm = loginNorm.includes('@') ?
      loginNorm
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
      const message = insErr instanceof Error ? insErr.message : 'Profil yaratilmadi';
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
