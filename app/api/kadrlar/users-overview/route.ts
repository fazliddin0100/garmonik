import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { listKadrlarUsersOverview } from '@/lib/kadrlar/users-overview';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }

  try {
    const sections = await listKadrlarUsersOverview();
    return NextResponse.json({ sections });
  } catch (error) {
    console.error('kadrlar/users-overview GET:', error);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
