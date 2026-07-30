import { cookies } from 'next/headers';
import { UserRole } from '.prisma/kassa-client';
import bcrypt from 'bcryptjs';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from '@/lib/auth/session-cookie';
import { signVerifiedSession, verifySessionToken } from '@/lib/auth/session-jwt';
import { prisma } from './prisma';
import {
  KASSA_SESSION_MAX_AGE_SEC,
  sessionUserToVerifiedSession,
  verifiedSessionToSessionUser,
  type SessionUser,
} from './unified-session';

export type { SessionUser };

const LOCKOUT_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

export async function createSession(user: SessionUser) {
  const cookieStore = await cookies();
  const unified = await signVerifiedSession(sessionUserToVerifiedSession(user));
  cookieStore.set(
    SESSION_COOKIE_NAME,
    unified,
    sessionCookieOptions(KASSA_SESSION_MAX_AGE_SEC),
  );
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const unified = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!unified) return null;

  const verified = await verifySessionToken(unified);
  return verified ? verifiedSessionToSessionUser(verified) : null;
}

export async function requireSession(roles?: UserRole[]) {
  const session = await getSession();
  if (!session) return null;
  if (roles && !roles.includes(session.role)) return null;
  return session;
}

export async function loginUser(
  login: string,
  password: string,
  ipAddress?: string,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const normalizedLogin = login.trim();
  const user = await prisma.user.findFirst({
    where: { login: { equals: normalizedLogin, mode: 'insensitive' } },
  });

  if (!user || !user.isActive) {
    await logAudit(null, 'LOGIN_FAILED', 'user', login, ipAddress);
    return { ok: false, error: "Login yoki parol noto'g'ri" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      ok: false,
      error: `Hisob bloklangan. ${mins} daqiqadan keyin urinib ko'ring`,
    };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    const failed = user.failedLoginCount + 1;
    const update: { failedLoginCount: number; lockedUntil?: Date } = {
      failedLoginCount: failed,
    };

    if (failed >= MAX_FAILED_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }

    await prisma.user.update({ where: { id: user.id }, data: update });
    await logAudit(user.id, 'LOGIN_FAILED', 'user', user.id, ipAddress);

    if (failed >= MAX_FAILED_ATTEMPTS) {
      return {
        ok: false,
        error: `5 marta noto'g'ri parol. Hisob ${LOCKOUT_MINUTES} daqiqaga bloklandi`,
      };
    }

    return { ok: false, error: "Login yoki parol noto'g'ri" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  const sessionUser: SessionUser = {
    id: user.id,
    login: user.login,
    fullName: user.fullName,
    role: user.role,
  };

  await createSession(sessionUser);
  await logAudit(user.id, 'LOGIN_SUCCESS', 'user', user.id, ipAddress);

  return { ok: true, user: sessionUser };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function logAudit(
  userId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  ipAddress?: string,
  details?: string,
) {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? undefined,
      action,
      entity,
      entityId,
      details,
      ipAddress,
    },
  });
}
