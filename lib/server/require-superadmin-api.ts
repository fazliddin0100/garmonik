import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { isSuperAdminUser } from '@/lib/auth/superadmin';
import type { NextRequest } from 'next/server';

/** Security Center APIlari — faqat `routeGroup: superadmin`. */
export async function requireSuperadminApiSession(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) return null;
  if (session.routeGroup === 'superadmin') return session;

  // Legacy profillarda routeGroup darhol yangilanmasligi mumkin.
  // Bunda superadminni login/roleLabel bilan ham aniqlaymiz.
  const login = session.login || '';
  const roleLabel = session.roleLabel || '';
  if (!isSuperAdminUser(login, roleLabel)) return null;

  return session;
}
