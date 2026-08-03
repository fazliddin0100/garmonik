import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { normalizeDepartmentGroups } from '@/lib/clinic-departments/roles';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';
import { readClinicResource } from '@/lib/server/clinic-resource-service';
import { NextRequest, NextResponse } from 'next/server';

function canAccessKadrlarDepartments(
  session: NonNullable<Awaited<ReturnType<typeof getAdminSessionFromRequest>>>,
): boolean {
  return session.routeGroup === 'admin_only' || session.routeGroup === 'hr';
}

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session || !canAccessKadrlarDepartments(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  try {
    const raw = await readClinicResource('departments');
    const departments = normalizeDepartmentGroups(raw) as DepartmentGroup[];
    return NextResponse.json({ departments });
  } catch (error) {
    console.error('kadrlar/departments GET:', error);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
