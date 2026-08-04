/**
 * Garmonik marshrut himoyasi (Next.js 16 `proxy.ts`).
 *
 * Token yo‘q yoki ruxsat yetmasa — login sahifasiga (`/auth/login?next=...`).
 * Kassa bo‘limi uchun alohida qoidalar (`/kassa/login` yoki birlashtirilgan login).
 */
import {
  adminCanAccessReportsRoute,
  adminHomePathForRouteGroup,
  adminReportsPathForRouteGroup,
  adminRouteGroupsAllowedForPath,
} from '@/lib/admins/portal-routes';
import {
  ADMIN_ONLY_PREFIXES,
  ROLE_ROUTE_PREFIXES,
  SHARED_STAFF_OR_ADMIN_PREFIXES,
  STAFF_ROLES_BY_ROUTE_GROUP,
  type StaffRouteGroup,
} from '@/lib/auth/constants';
import { readSessionTokenFromRequest } from '@/lib/auth/session-cookie';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import type { VerifiedSession } from '@/lib/auth/session-jwt';
import {
  isKassaProtectedPath,
  isKassaPublicPath,
  kassaLoginUrl,
  readKassaAccessFromRequest,
} from '@/lib/auth/kassa-proxy';
import { staffHomePath } from '@/lib/staff-portal/staff-home';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function pathUnderPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function underAny(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((p) => pathUnderPrefix(pathname, p));
}

function loginUrl(request: NextRequest, pathname: string) {
  const u = new URL('/auth/login', request.url);
  u.searchParams.set('next', pathname);
  return u;
}

function isHeadDoctorRoleLabel(roleLabel: string): boolean {
  return roleLabel.trim().toLowerCase() === 'bosh shifokor';
}

/** Matcher dagi yo‘llar — xatolikda ham login ga yo‘naltirish uchun */
function isProtectedPathname(pathname: string): boolean {
  if (underAny(pathname, SHARED_STAFF_OR_ADMIN_PREFIXES)) return true;
  if (underAny(pathname, ADMIN_ONLY_PREFIXES)) return true;

  for (const group of Object.keys(ROLE_ROUTE_PREFIXES) as StaffRouteGroup[]) {
    if (underAny(pathname, ROLE_ROUTE_PREFIXES[group])) return true;
  }

  return isKassaProtectedPath(pathname) && !isKassaPublicPath(pathname);
}

function loginRedirectForPath(request: NextRequest, pathname: string) {
  if (
    isKassaProtectedPath(pathname) &&
    !isKassaPublicPath(pathname) &&
    !pathname.startsWith('/api/kassa')
  ) {
    return NextResponse.redirect(kassaLoginUrl(request, pathname));
  }
  return NextResponse.redirect(loginUrl(request, pathname));
}

export async function proxy(request: NextRequest) {
  try {
    return await handleProxy(request);
  } catch (error) {
    console.error('[proxy]', error);
    const { pathname } = request.nextUrl;
    if (isProtectedPathname(pathname)) {
      return loginRedirectForPath(request, pathname);
    }
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}

async function handleProxy(request: NextRequest) {
  const sessionResponse = NextResponse.next({
    request: { headers: request.headers },
  });
  const { pathname } = request.nextUrl;

  let session: VerifiedSession | null = null;
  const token = readSessionTokenFromRequest(request);
  if (token) {
    session = await verifySessionToken(token);
  }

  function redirect(url: URL) {
    return NextResponse.redirect(url);
  }

  if (underAny(pathname, SHARED_STAFF_OR_ADMIN_PREFIXES)) {
    if (!session) {
      return redirect(loginUrl(request, pathname));
    }

    if (
      session.kind === 'admin' &&
      session.routeGroup === 'superadmin' &&
      pathUnderPrefix(pathname, '/reports')
    ) {
      return redirect(new URL('/security-center', request.url));
    }

    if (session.kind === 'staff' && pathUnderPrefix(pathname, '/reports')) {
      return redirect(
        new URL(`${staffHomePath(session.role)}/hisobotlar`, request.url),
      );
    }

    if (
      session.kind === 'admin' &&
      pathUnderPrefix(pathname, '/reports') &&
      !adminCanAccessReportsRoute(session.routeGroup)
    ) {
      return redirect(
        new URL(adminReportsPathForRouteGroup(session.routeGroup), request.url),
      );
    }

    return sessionResponse;
  }

  if (underAny(pathname, ADMIN_ONLY_PREFIXES)) {
    if (!session || session.kind !== 'admin') {
      return redirect(loginUrl(request, pathname));
    }

    if (pathUnderPrefix(pathname, '/users/admins')) {
      const canEnterAdminsPage =
        session.routeGroup === 'admin_only' ||
        (session.routeGroup === 'clinical' &&
          isHeadDoctorRoleLabel(session.roleLabel || ''));

      if (!canEnterAdminsPage) {
        return redirect(
          new URL(adminHomePathForRouteGroup(session.routeGroup), request.url),
        );
      }

      return sessionResponse;
    }

    const allowed = adminRouteGroupsAllowedForPath(pathname);
    if (!allowed.includes(session.routeGroup)) {
      return redirect(
        new URL(adminHomePathForRouteGroup(session.routeGroup), request.url),
      );
    }

    return sessionResponse;
  }

  for (const group of Object.keys(ROLE_ROUTE_PREFIXES) as StaffRouteGroup[]) {
    const prefixes = ROLE_ROUTE_PREFIXES[group];
    if (!underAny(pathname, prefixes)) continue;

    const allowed = STAFF_ROLES_BY_ROUTE_GROUP[group];

    if (session?.kind === 'staff' && allowed.includes(session.role)) {
      return sessionResponse;
    }

    if (session?.kind === 'admin' && session.routeGroup === group) {
      return sessionResponse;
    }

    if (
      session?.kind === 'admin' &&
      group === 'office' &&
      session.routeGroup === 'reception'
    ) {
      return sessionResponse;
    }

    if (session?.kind === 'admin' && session.routeGroup !== 'admin_only') {
      return redirect(
        new URL(adminHomePathForRouteGroup(session.routeGroup), request.url),
      );
    }

    if (session?.kind === 'admin' && session.routeGroup === 'admin_only') {
      return redirect(new URL('/dashboard', request.url));
    }

    return redirect(loginUrl(request, pathname));
  }

  if (isKassaProtectedPath(pathname)) {
    if (isKassaPublicPath(pathname)) {
      return sessionResponse;
    }

    const kassaAccess = await readKassaAccessFromRequest(request, session);
    if (!kassaAccess) {
      if (pathname.startsWith('/api/kassa')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return redirect(kassaLoginUrl(request, pathname));
    }

    const adminOnly =
      pathUnderPrefix(pathname, '/kassa-admin') ||
      pathname.startsWith('/api/kassa/admin/') ||
      pathname.startsWith('/api/kassa/users');

    if (adminOnly && kassaAccess.role !== 'ADMIN') {
      if (pathname.startsWith('/api/kassa')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return redirect(new URL('/kassir', request.url));
    }

    return sessionResponse;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/security-center/:path*',
    '/users/:path*',
    '/kadrlar/:path*',
    '/patients/:path*',
    '/appointments/:path*',
    '/services/:path*',
    '/settings/:path*',
    '/taminot/:path*',
    '/reports/:path*',
    '/doctor/:path*',
    '/labaratoriya/:path*',
    '/hamshiralar/:path*',
    '/bosh-hamshira/:path*',
    '/kabinet',
    '/kabinet/:path*',
    '/mutaxassis/:path*',
    '/farmatsevt/:path*',
    '/oshxona/:path*',
    '/portal-unavailable',
    '/portal-unavailable/:path*',
    '/kassa',
    '/kassa/:path*',
    '/kassir',
    '/kassir/:path*',
    '/kassa-admin/:path*',
    '/api/kassa/:path*',
    '/user',
    '/user/:path*',
  ],
};
