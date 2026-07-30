import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ kind: 'none' as const }, { status: 200 });
  }

  if (session.kind === 'admin') {
    return NextResponse.json({
      kind: 'admin' as const,
      id: session.id,
      routeGroup: session.routeGroup,
      login: session.login,
      fullName: session.displayName,
      roleLabel: session.roleLabel,
    });
  }

  if (session.kind === 'kassa') {
    return NextResponse.json({
      kind: 'kassa' as const,
      id: session.id,
      role: session.role,
      login: session.login,
      fullName: session.fullName,
    });
  }

  return NextResponse.json({
    kind: 'staff' as const,
    id: session.id,
    role: session.role,
    login: session.login,
    fullName: session.fullName,
    ...(session.narrowSpecialistId ?
      { narrowSpecialistId: session.narrowSpecialistId }
    : {}),
  });
}
