import { authenticatePortalCredentials } from '@/lib/auth/portal-session';
import { attachSessionCookie } from '@/lib/auth/session-cookie';
import {
  findPortalLoginByCredential,
  portalLoginRedirect,
  portalLoginRoleKey,
} from '@/lib/kadrlar/portal-login';
import { updateProfileLastLogin } from '@/lib/db/portal-profiles';
import { blockedIpResponse, isRequestIpBlocked } from '@/lib/server/ip-block';
import { logSecurityEvent } from '@/lib/server/security-log';
import { ensureStaffPortalSeed } from '@/lib/staff-portal/db-staff';
import { isAdminJwtRouteGroup } from '@/lib/admins/portal-routes';
import { isStaffRole, type StaffRole } from '@/lib/staff-portal/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (await isRequestIpBlocked(request)) {
      return blockedIpResponse();
    }

    const body = await request.json();
    const login = typeof body.login === 'string' ? body.login.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!login || !password) {
      return NextResponse.json(
        { error: 'Login va parol kiritilishi kerak' },
        { status: 400 },
      );
    }

    await ensureStaffPortalSeed();
    const key = login.toLowerCase();
    const row = await findPortalLoginByCredential(key);
    if (!row) {
      await logSecurityEvent({
        request,
        session: null,
        eventType: 'staff_login_failed',
        target: '/api/staff/login',
        meta: { login: key },
      });
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri" },
        { status: 401 },
      );
    }

    const verified = await authenticatePortalCredentials(row, password);
    if (!verified) {
      await logSecurityEvent({
        request,
        session: null,
        eventType: 'staff_login_failed',
        target: '/api/staff/login',
        meta: { login: key },
      });
      return NextResponse.json(
        { error: "Login yoki parol noto'g'ri" },
        { status: 401 },
      );
    }

    await updateProfileLastLogin(row.user_id);

    const loginLabel = row.staff_login || row.auth_email;
    const roleKey = portalLoginRoleKey(row);
    const redirect = portalLoginRedirect(row, key);
    const isStaff = row.account_kind === 'staff' && isStaffRole(row.staff_role || '');

    let jsonRes = NextResponse.json({
      ok: true,
      redirect,
      role: roleKey,
      accountKind: row.account_kind,
      login: loginLabel,
      fullName: row.display_name,
    });
    jsonRes = await attachSessionCookie(jsonRes, verified);

    await logSecurityEvent({
      request,
      session:
        isStaff ?
          {
            kind: 'staff',
            id: row.user_id,
            clinicId: row.clinic_id,
            role: row.staff_role as StaffRole,
            login: loginLabel,
            fullName: row.display_name,
          }
        : {
            kind: 'admin',
            id: row.user_id,
            clinicId: row.clinic_id,
            routeGroup:
              row.admin_route_group && isAdminJwtRouteGroup(row.admin_route_group) ?
                row.admin_route_group
              : 'admin_only',
            login: loginLabel,
            displayName: row.display_name,
            roleLabel: row.role_label || '',
          },
      eventType: 'staff_login_success',
      target: '/api/staff/login',
    });
    return jsonRes;
  } catch (e) {
    console.error('staff login:', e);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
