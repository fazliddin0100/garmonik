import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware / klient: cookie → Supabase sessiya → profil.
 */
export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ kind: 'none' as const }, { status: 200 });
  }
  return NextResponse.json(session, { status: 200 });
}
