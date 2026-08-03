import { adminRoleLabelToJwtRouteGroup } from '@/lib/admins/portal-routes';
import { isAllowedAdminCreationRole } from '@/lib/admins/roles';
import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  createPortalAuthUser,
  deletePortalAuthUser,
} from '@/lib/auth/portal-session';
import {
  adminLoginExists,
  insertPortalProfile,
} from '@/lib/db/portal-profiles';
import {
  ensureKassaPortalUser,
  isKassaPortalRole,
  isKassaPortalRouteGroup,
  resolveKassaBridgeRole,
} from '@/lib/kassa/portal-cashier-bridge';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { NextRequest, NextResponse } from 'next/server';

const PHONE_UZ = /^\+998\d{9}$/;

/** Yangi administrator — PostgreSQL `app_users` + `portal_user_profiles`. */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
    }

    const body = await request.json();
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const fatherName =
      typeof body.fatherName === 'string' ? body.fatherName.trim() : '';
    const ageRaw = body.age;
    const age =
      typeof ageRaw === 'number' && Number.isFinite(ageRaw) ?
        Math.round(ageRaw)
      : typeof ageRaw === 'string' && ageRaw.trim() ?
        Math.round(Number.parseInt(ageRaw, 10))
      : NaN;
    const roleName = typeof body.roleName === 'string' ? body.roleName.trim() : '';
    const loginRaw = typeof body.login === 'string' ? body.login.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const department =
      typeof body.department === 'string' ? body.department.trim() : '';

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'Ism va familiya kiritilishi kerak' }, { status: 400 });
    }
    if (!fatherName) {
      return NextResponse.json(
        { error: 'Otasining ismi kiritilishi kerak' },
        { status: 400 },
      );
    }
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      return NextResponse.json({ error: 'Yosh 1–120 orasida bo‘lishi kerak' }, { status: 400 });
    }
    if (!roleName || roleName.length > 200) {
      return NextResponse.json({ error: 'Rol tanlang yoki kiriting' }, { status: 400 });
    }
    if (!isAllowedAdminCreationRole(roleName)) {
      return NextResponse.json(
        { error: 'Faqat Administrator yoki Super administrator roli tanlanishi mumkin' },
        { status: 400 },
      );
    }
    if (!loginRaw || loginRaw.length < 2) {
      return NextResponse.json({ error: 'Login juda qisqa' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Parol kamida 6 belgidan iborat bo‘lsin' },
        { status: 400 },
      );
    }
    if (!PHONE_UZ.test(phone)) {
      return NextResponse.json(
        { error: "Telefon +998XXXXXXXXX formatida bo'lishi kerak" },
        { status: 400 },
      );
    }

    const loginNorm = loginRaw.toLowerCase();
    const fullName = `${firstName} ${lastName} ${fatherName}`.trim();
    const emailNorm = loginRaw.includes('@') ?
      loginNorm
    : `${loginNorm}@garmonik.admin.local`;

    if (await adminLoginExists(loginNorm, emailNorm)) {
      return NextResponse.json({ error: 'Bu login allaqachon band' }, { status: 409 });
    }

    const clinicId = await getDefaultClinicId();
    const rg = adminRoleLabelToJwtRouteGroup(roleName, loginNorm);

    const created = await createPortalAuthUser({
      email: emailNorm,
      password,
    });

    try {
      await insertPortalProfile({
        user_id: created.id,
        clinic_id: clinicId,
        account_kind: 'admin',
        auth_email: emailNorm,
        admin_route_group: rg,
        staff_role: null,
        display_name: fullName,
        role_label: roleName,
        staff_login: loginNorm,
        first_name: firstName,
        last_name: lastName,
        father_name: fatherName,
        age,
        phone,
        department: department || '',
        is_active: true,
      });
    } catch (insErr) {
      await deletePortalAuthUser(created.id);
      const message = insErr instanceof Error ? insErr.message : 'Profil yaratilmadi';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (isKassaPortalRouteGroup(rg) || isKassaPortalRole(roleName)) {
      try {
        await ensureKassaPortalUser({
          login: loginNorm,
          password,
          fullName,
          role: resolveKassaBridgeRole({
            roleLabel: roleName,
            routeGroup: rg,
          }),
        });
      } catch (kassaErr) {
        await deletePortalAuthUser(created.id);
        const message =
          kassaErr instanceof Error ? kassaErr.message : 'Kassa hisobi yaratilmadi';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    return NextResponse.json({
      ok: true,
      userId: created.id,
      login: loginNorm,
      firstName,
      lastName,
      fatherName,
      age,
      roleName,
      phone,
      adminRouteGroup: rg,
    });
  } catch (e) {
    console.error('create-portal-admin:', e);
    return NextResponse.json({ error: 'Serverda xatolik' }, { status: 500 });
  }
}
