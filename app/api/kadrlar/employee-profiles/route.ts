import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  getEmployeeProfile,
  upsertEmployeeProfile,
  type KadrlarEmployeeProfileInput,
} from '@/lib/kadrlar/employee-profiles';
import { parseBirthInputToIso } from '@/lib/patients/birth-display';
import type { KadrlarStaffKind } from '@/lib/kadrlar/staff-kind';
import { NextRequest, NextResponse } from 'next/server';

function canAccess(
  session: NonNullable<Awaited<ReturnType<typeof getAdminSessionFromRequest>>>,
) {
  return session.routeGroup === 'admin_only' || session.routeGroup === 'hr';
}

const STAFF_KINDS = new Set<KadrlarStaffKind>([
  'doctor',
  'nurse',
  'laboratory',
  'reception',
  'pharmacist',
  'kitchen',
  'office',
]);

function parseStaffKind(raw: string | null): KadrlarStaffKind | null {
  const value = raw?.trim() as KadrlarStaffKind | undefined;
  if (!value || !STAFF_KINDS.has(value)) return null;
  return value;
}

function parseBirthDate(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  const iso = parseBirthInputToIso(String(raw));
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  return iso;
}

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session || !canAccess(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const employeeId = request.nextUrl.searchParams.get('employeeId')?.trim();
  const staffKind = parseStaffKind(
    request.nextUrl.searchParams.get('staffKind'),
  );
  if (!employeeId || !staffKind) {
    return NextResponse.json(
      { error: 'employeeId va staffKind kerak' },
      { status: 400 },
    );
  }

  try {
    const profile = await getEmployeeProfile(employeeId, staffKind);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('kadrlar/employee-profiles GET:', error);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session || !canAccess(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Partial<KadrlarEmployeeProfileInput>;
    const employeeId =
      typeof body.employeeId === 'string' ? body.employeeId.trim() : '';
    const staffKind = parseStaffKind(
      typeof body.staffKind === 'string' ? body.staffKind : null,
    );
    if (!employeeId || !staffKind) {
      return NextResponse.json(
        { error: 'employeeId va staffKind kerak' },
        { status: 400 },
      );
    }

    const birthDate = parseBirthDate(body.birthDate);
    if (body.birthDate && !birthDate) {
      return NextResponse.json(
        { error: 'Tug‘ilgan sana noto‘g‘ri formatda (YYYY-MM-DD yoki DD.MM.YYYY)' },
        { status: 400 },
      );
    }

    const profile = await upsertEmployeeProfile({
      employeeId,
      staffKind,
      firstName:
        typeof body.firstName === 'string' ? body.firstName.trim() : '',
      lastName: typeof body.lastName === 'string' ? body.lastName.trim() : '',
      birthDate,
      activityDirection:
        typeof body.activityDirection === 'string' ?
          body.activityDirection.trim()
        : '',
      address: typeof body.address === 'string' ? body.address.trim() : '',
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('kadrlar/employee-profiles PUT:', error);
    const message =
      error instanceof Error ? error.message : 'Server xatoligi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
