import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { listKadrlarUsersForDepartment } from '@/lib/kadrlar/department-users';
import { NextRequest, NextResponse } from 'next/server';

function canAccess(session: NonNullable<Awaited<ReturnType<typeof getAdminSessionFromRequest>>>) {
  return session.routeGroup === 'admin_only' || session.routeGroup === 'hr';
}

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session || !canAccess(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const departmentId = request.nextUrl.searchParams.get('departmentId')?.trim();
  if (!departmentId) {
    return NextResponse.json({ error: 'departmentId kerak' }, { status: 400 });
  }

  try {
    const result = await listKadrlarUsersForDepartment(departmentId);
    if (!result.department) {
      return NextResponse.json({ error: 'Bo‘lim topilmadi' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error('kadrlar/department-users GET:', error);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
