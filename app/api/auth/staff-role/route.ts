import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!session || session.kind !== 'staff') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({
    role: session.role,
    login: session.login,
    fullName: session.fullName,
  });
}
