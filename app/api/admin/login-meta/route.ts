import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  fetchProfileClinicId,
  listAdminLoginMeta,
} from '@/lib/db/portal-profiles';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
    }

    const clinicId = await fetchProfileClinicId(session.id);
    if (!clinicId) {
      return NextResponse.json({ items: [] });
    }

    const rows = await listAdminLoginMeta(clinicId);
    const items = rows.map((r) => ({
      login: (r.staff_login || r.auth_email || '') as string,
      lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error('admin/login-meta:', e);
    return NextResponse.json({ error: 'O‘qib bo‘lmadi' }, { status: 500 });
  }
}
