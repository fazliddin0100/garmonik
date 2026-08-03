import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { isClinicPortalSession } from '@/lib/auth/session-guards';
import { listDoctorsInClinic } from '@/lib/db/portal-profiles';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!isClinicPortalSession(session)) {
    return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
  }

  try {
    const data = await listDoctorsInClinic(session.clinicId);
    const items = data.map((row) => ({
      id: row.user_id,
      fullName: row.display_name || 'Shifokor',
      department: row.department || '',
      role: row.staff_role || '',
    }));
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O‘qib bo‘lmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
