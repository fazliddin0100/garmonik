import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { updateProfileLastLogin } from '@/lib/db/portal-profiles';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
    }
    await updateProfileLastLogin(session.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('admin/touch-login:', e);
    return NextResponse.json({ error: 'Yangilab bo‘lmadi' }, { status: 500 });
  }
}
