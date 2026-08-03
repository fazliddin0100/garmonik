import type { VerifiedSession } from '@/lib/auth/session-jwt';

/** Klinika portali (admin yoki xodim) — clinicId mavjud. */
export type ClinicPortalSession = Extract<
  VerifiedSession,
  { kind: 'admin' } | { kind: 'staff' }
>;

export function isClinicPortalSession(
  session: VerifiedSession | null | undefined,
): session is ClinicPortalSession {
  return session?.kind === 'admin' || session?.kind === 'staff';
}

export function isKassaSession(
  session: VerifiedSession | null | undefined,
): session is Extract<VerifiedSession, { kind: 'kassa' }> {
  return session?.kind === 'kassa';
}

export function sessionPersonName(session: VerifiedSession): string {
  if (session.kind === 'admin') return session.displayName;
  return session.fullName;
}
