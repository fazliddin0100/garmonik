import {
  adminHomePathForRouteGroup,
  adminRoleLabelToJwtRouteGroup,
  isAdminJwtRouteGroup,
} from '@/lib/admins/portal-routes';
import { authenticatePortalCredentials } from '@/lib/auth/portal-session';
import { attachSessionCookie } from '@/lib/auth/session-cookie';
import { SUPERADMIN_LOGIN_REDIRECT } from '@/lib/auth/superadmin';
import {
  findAdminProfileByLogin,
  updatePortalProfile,
  updateProfileLastLogin,
} from '@/lib/db/portal-profiles';
import {
  ensureKassaPortalUser,
  isKassaPortalRole,
  isKassaPortalRouteGroup,
  kassaHomePathForBridgeRole,
  resolveKassaBridgeRole,
} from '@/lib/kassa/portal-cashier-bridge';
import { sessionUserToVerifiedSession } from '@/lib/kassa/unified-session';
import { blockedIpResponse, isRequestIpBlocked } from '@/lib/server/ip-block';
import { logSecurityEvent } from '@/lib/server/security-log';
import { NextRequest, NextResponse } from 'next/server';

function loginEquals(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Barcha adminlar — PostgreSQL `app_users` + JWT sessiya. */
export async function handleClinicAdminLogin(
  request: NextRequest,
  logTarget: string,
): Promise<NextResponse> {
  try {
    if (await isRequestIpBlocked(request)) {
      return blockedIpResponse();
    }

    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Login va parol kiritilishi kerak' },
        { status: 400 },
      );
    }

    const loginTrim = typeof login === 'string' ? login.trim() : '';
    const loginNorm = loginTrim.toLowerCase();
    const profile = await findAdminProfileByLogin(loginNorm);

    if (!profile) {
      await logSecurityEvent({
        request,
        session: null,
        eventType: 'admin_login_failed',
        target: logTarget,
        meta: { login: loginTrim },
      });
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri" },
        { status: 401 },
      );
    }

    const passwordStr = typeof password === 'string' ? password : '';
    const verified = await authenticatePortalCredentials(profile, passwordStr);

    if (!verified || verified.kind !== 'admin') {
      await logSecurityEvent({
        request,
        session: null,
        eventType: 'admin_login_failed',
        target: logTarget,
        meta: { login: loginTrim },
      });
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri" },
        { status: 401 },
      );
    }

    await updateProfileLastLogin(profile.user_id);

    const roleLabel = profile.role_label?.trim() || '';
    const dispLogin = profile.staff_login?.trim() || profile.auth_email;
    const fromLabel = adminRoleLabelToJwtRouteGroup(roleLabel, dispLogin);
    const stored =
      profile.admin_route_group && isAdminJwtRouteGroup(profile.admin_route_group) ?
        profile.admin_route_group
      : null;

    const rg =
      fromLabel !== 'admin_only' ? fromLabel
      : isKassaPortalRole(roleLabel) ? 'finance'
      : (stored ?? fromLabel);

    if (stored !== rg) {
      try {
        await updatePortalProfile(profile.clinic_id, profile.user_id, {
          admin_route_group: rg,
        });
      } catch {
        /* ignore sync errors */
      }
    }

    const displayName = profile.display_name?.trim() || dispLogin;
    const adminLogin = (process.env.SEED_ADMIN_LOGIN || 'admin').trim();
    const seedAdminLanding =
      loginEquals(dispLogin, adminLogin) && rg === 'admin_only';

    /** Buxgalter → /kassa-admin; Kassir → /kassa */
    if (isKassaPortalRouteGroup(rg) || isKassaPortalRole(roleLabel)) {
      try {
        const kassaRole = resolveKassaBridgeRole({
          roleLabel,
          routeGroup: rg,
        });
        const kassaUser = await ensureKassaPortalUser({
          login: (profile.staff_login || loginNorm).trim().toLowerCase(),
          password: passwordStr,
          fullName: displayName,
          role: kassaRole,
        });
        const kassaSession = sessionUserToVerifiedSession(kassaUser);
        let jsonRes = NextResponse.json(
          {
            message: 'Muvaffaqiyatli kirildi',
            redirect: kassaHomePathForBridgeRole(kassaRole),
          },
          { status: 200 },
        );
        jsonRes = await attachSessionCookie(jsonRes, kassaSession);
        await logSecurityEvent({
          request,
          session: kassaSession,
          eventType: 'admin_login_success',
          target: logTarget,
        });
        return jsonRes;
      } catch (e) {
        console.error('kassa bridge login:', e);
        return NextResponse.json(
          { error: 'Kassa hisobi yaratilmadi. Admin bilan bog‘laning.' },
          { status: 500 },
        );
      }
    }

    const redirectPath =
      rg === 'superadmin' ? SUPERADMIN_LOGIN_REDIRECT
      : seedAdminLanding ? '/dashboard'
      : adminHomePathForRouteGroup(rg);

    /** JWT dagi routeGroup yangilangan bo‘lishi shart (masalan Xo‘jalik → kitchen) */
    const sessionForCookie =
      verified.kind === 'admin' ?
        { ...verified, routeGroup: rg, roleLabel: roleLabel || verified.roleLabel }
      : verified;

    let jsonRes = NextResponse.json(
      {
        message: 'Muvaffaqiyatli kirildi',
        redirect: redirectPath,
        ...(seedAdminLanding ? { dashboardView: 'service-types' as const } : {}),
      },
      { status: 200 },
    );

    jsonRes = await attachSessionCookie(jsonRes, sessionForCookie);

    await logSecurityEvent({
      request,
      session: verified,
      eventType: 'admin_login_success',
      target: logTarget,
    });
    return jsonRes;
  } catch (error) {
    console.error('Clinic admin login error:', error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
