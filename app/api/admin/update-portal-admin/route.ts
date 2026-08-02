import { adminRoleLabelToJwtRouteGroup } from '@/lib/admins/portal-routes';
import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  deletePortalAuthUser,
  updatePortalAuthPassword,
} from '@/lib/auth/portal-session';
import {
  findAdminProfileByLogin,
  findProfileInClinic,
  updatePortalProfile,
} from '@/lib/db/portal-profiles';
import {
  deactivateKassaCashierByLogin,
  ensureKassaPortalUser,
  isKassaPortalRole,
  isKassaPortalRouteGroup,
  resolveKassaBridgeRole,
} from '@/lib/kassa/portal-cashier-bridge';
import { prisma as kassaPrisma } from '@/lib/kassa/prisma';
import { NextRequest, NextResponse } from 'next/server';

const PHONE_UZ = /^\+998\d{9}$/;

/** Klinik admin — portal profilini yangilash (Ta'minot va boshqa cheklangan rollar ham). */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session || session.routeGroup !== 'admin_only') {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const loginRaw =
      typeof body.login === 'string' ? body.login.trim().toLowerCase() : '';
    const userId =
      typeof body.userId === 'string' ? body.userId.trim() : '';

    let profile =
      userId ?
        await findProfileInClinic(session.clinicId, userId, 'admin')
      : null;
    if (!profile && loginRaw) {
      profile = await findAdminProfileByLogin(loginRaw);
    }
    if (!profile || profile.clinic_id !== session.clinicId) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    const firstName =
      typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
    const lastName =
      typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
    const fatherName =
      typeof body.fatherName === 'string' ? body.fatherName.trim() : undefined;
    const ageRaw = body.age;
    const age =
      typeof ageRaw === 'number' && Number.isFinite(ageRaw) ?
        Math.round(ageRaw)
      : typeof ageRaw === 'string' && ageRaw.trim() ?
        Math.round(Number.parseInt(ageRaw, 10))
      : undefined;
    const roleName =
      typeof body.roleName === 'string' ? body.roleName.trim() : undefined;
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const newLogin =
      typeof body.newLogin === 'string' ? body.newLogin.trim().toLowerCase() : '';
    const password =
      typeof body.password === 'string' ? body.password : '';

    if (phone !== undefined && phone && !PHONE_UZ.test(phone)) {
      return NextResponse.json(
        { error: "Telefon +998XXXXXXXXX formatida bo'lishi kerak" },
        { status: 400 },
      );
    }
    if (age !== undefined && (!Number.isFinite(age) || age < 1 || age > 120)) {
      return NextResponse.json(
        { error: 'Yosh 1–120 orasida bo‘lishi kerak' },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};
    if (firstName !== undefined) patch.first_name = firstName;
    if (lastName !== undefined) patch.last_name = lastName;
    if (fatherName !== undefined) patch.father_name = fatherName;
    if (age !== undefined) patch.age = age;
    if (phone !== undefined) patch.phone = phone;
    if (roleName !== undefined) {
      patch.role_label = roleName;
      const loginKey = newLogin || profile.staff_login || profile.auth_email;
      patch.admin_route_group = adminRoleLabelToJwtRouteGroup(roleName, loginKey);
    }
    if (newLogin && newLogin.length >= 2) {
      patch.staff_login = newLogin;
    }

    const fn =
      (patch.first_name as string | undefined) ?? profile.first_name ?? '';
    const ln =
      (patch.last_name as string | undefined) ?? profile.last_name ?? '';
    const fan =
      (patch.father_name as string | undefined) ?? profile.father_name ?? '';
    const parts = [fn, ln, fan].map((s) => String(s || '').trim()).filter(Boolean);
    if (parts.length > 0) {
      patch.display_name = parts.join(' ');
    }

    if (password.length >= 6) {
      await updatePortalAuthPassword(profile.user_id, password);
    }

    if (Object.keys(patch).length > 0) {
      await updatePortalProfile(session.clinicId, profile.user_id, patch);
    }

    const nextRole =
      (patch.role_label as string | undefined) || profile.role_label || '';
    const nextLogin = (
      (patch.staff_login as string | undefined) ||
      profile.staff_login ||
      loginRaw
    )
      .trim()
      .toLowerCase();
    const nextName =
      (patch.display_name as string | undefined) ||
      profile.display_name ||
      nextLogin;
    const prevLogin = (profile.staff_login || loginRaw).trim().toLowerCase();

    const nextRg =
      typeof patch.admin_route_group === 'string' && patch.admin_route_group ?
        patch.admin_route_group
      : profile.admin_route_group;
    if (isKassaPortalRole(nextRole) || isKassaPortalRouteGroup(nextRg)) {
      const kassaRole = resolveKassaBridgeRole({
        roleLabel: nextRole,
        routeGroup: nextRg,
      });
      if (password.length >= 6) {
        await ensureKassaPortalUser({
          login: nextLogin,
          password,
          fullName: nextName,
          role: kassaRole,
        });
      } else if (prevLogin) {
        try {
          await kassaPrisma.user.updateMany({
            where: { login: { equals: prevLogin, mode: 'insensitive' } },
            data: {
              login: nextLogin,
              fullName: nextName,
              role: kassaRole,
              isActive: true,
            },
          });
        } catch {
          /* optional */
        }
      }
    }

    return NextResponse.json({
      ok: true,
      userId: profile.user_id,
      login: (patch.staff_login as string | undefined) || profile.staff_login,
      roleName: (patch.role_label as string | undefined) || profile.role_label,
      adminRouteGroup:
        (patch.admin_route_group as string | undefined) ||
        profile.admin_route_group,
    });
  } catch (e) {
    console.error('update-portal-admin:', e);
    return NextResponse.json({ error: 'Serverda xatolik' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session || session.routeGroup !== 'admin_only') {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const loginRaw =
      typeof body.login === 'string' ? body.login.trim().toLowerCase() : '';
    const userId =
      typeof body.userId === 'string' ? body.userId.trim() : '';

    let profile =
      userId ?
        await findProfileInClinic(session.clinicId, userId, 'admin')
      : null;
    if (!profile && loginRaw) {
      profile = await findAdminProfileByLogin(loginRaw);
    }
    if (!profile || profile.clinic_id !== session.clinicId) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }
    if (profile.user_id === session.id) {
      return NextResponse.json(
        { error: 'O‘zingizni o‘chirib bo‘lmaydi' },
        { status: 400 },
      );
    }

    const login = (profile.staff_login || loginRaw).trim().toLowerCase();
    if (
      login &&
      (isKassaPortalRole(profile.role_label) ||
        isKassaPortalRouteGroup(profile.admin_route_group))
    ) {
      await deactivateKassaCashierByLogin(login).catch(() => undefined);
    }
    await deletePortalAuthUser(profile.user_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('delete-portal-admin:', e);
    return NextResponse.json({ error: 'Serverda xatolik' }, { status: 500 });
  }
}
