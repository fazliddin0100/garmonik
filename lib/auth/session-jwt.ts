import type { AdminJwtRouteGroup } from '@/lib/admins/portal-routes';
import type { StaffRole } from '@/lib/staff-portal/types';
import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/db/env';

/** Sessiya JWT — maksimal 5 soat */
const JWT_EXPIRES = '5h';
const SESSION_CLAIM = 'garmonik_session';

function secretKey() {
  return new TextEncoder().encode(getJwtSecret());
}

export type { AdminJwtRouteGroup };

export type VerifiedSession =
  | {
      kind: 'admin';
      id: string;
      clinicId: string;
      routeGroup: AdminJwtRouteGroup;
      login: string;
      displayName: string;
      roleLabel: string;
    }
  | {
      kind: 'staff';
      id: string;
      clinicId: string;
      role: StaffRole;
      login: string;
      fullName: string;
      narrowSpecialistId?: string;
    }
  | {
      kind: 'kassa';
      id: string;
      role: 'ADMIN' | 'CASHIER';
      login: string;
      fullName: string;
    };

function isVerifiedSession(value: unknown): value is VerifiedSession {
  if (!value || typeof value !== 'object') return false;
  const v = value as VerifiedSession;
  if (v.kind === 'admin') {
    return (
      typeof v.id === 'string' &&
      typeof v.clinicId === 'string' &&
      typeof v.routeGroup === 'string' &&
      typeof v.login === 'string'
    );
  }
  if (v.kind === 'staff') {
    return (
      typeof v.id === 'string' &&
      typeof v.clinicId === 'string' &&
      typeof v.role === 'string' &&
      typeof v.login === 'string'
    );
  }
  if (v.kind === 'kassa') {
    return (
      typeof v.id === 'string' &&
      (v.role === 'ADMIN' || v.role === 'CASHIER') &&
      typeof v.login === 'string' &&
      typeof v.fullName === 'string'
    );
  }
  return false;
}

/** JWT ichida to‘liq sessiya — Edge middleware uchun DB kerak emas. */
export async function signVerifiedSession(
  session: VerifiedSession,
): Promise<string> {
  return new SignJWT({ [SESSION_CLAIM]: session })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<VerifiedSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
    });
    const session = (payload as Record<string, unknown>)[SESSION_CLAIM];
    if (isVerifiedSession(session)) return session;
    const id =
      typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
    return id ? null : null;
  } catch {
    return null;
  }
}

/** @deprecated signVerifiedSession ishlating */
export async function signAdminSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(secretKey());
}

/** @deprecated signVerifiedSession ishlating */
export async function signStaffSessionToken(staffId: string): Promise<string> {
  return signAdminSessionToken(staffId);
}

export async function verifyJwtSub(token: string): Promise<string | null> {
  const session = await verifySessionToken(token);
  return session?.id ?? null;
}