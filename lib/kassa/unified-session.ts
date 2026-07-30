import type { UserRole } from '.prisma/kassa-client';
import type { VerifiedSession } from '@/lib/auth/session-jwt';

export type SessionUser = {
  id: string;
  login: string;
  fullName: string;
  role: UserRole;
};

export const KASSA_SESSION_MAX_AGE_SEC = 30 * 60;

export function sessionUserToVerifiedSession(user: SessionUser): VerifiedSession {
  return {
    kind: 'kassa',
    id: user.id,
    role: user.role,
    login: user.login,
    fullName: user.fullName,
  };
}

export function verifiedSessionToSessionUser(
  session: VerifiedSession,
): SessionUser | null {
  if (session.kind !== 'kassa') return null;
  return {
    id: session.id,
    login: session.login,
    fullName: session.fullName,
    role: session.role as UserRole,
  };
}
