import { canManageDepartmentStaff } from '@/lib/auth/department-staff-access';
import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  createNurseStaffAccount,
  deleteNurseStaffAccount,
  listNurseStaffAccounts,
  updateNurseStaffAccount,
} from '@/lib/nurses/db-nurses';
import { normalizeNurseStaffRole } from '@/lib/nurses/types';
import { NextRequest, NextResponse } from 'next/server';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Server xatoligi';
}

function canAccess(admin: Awaited<ReturnType<typeof getAdminSessionFromRequest>>) {
  return canManageDepartmentStaff(admin, ['nursing', 'head_nursing'] as const);
}

function nurseInputFromBody(body: Record<string, unknown>) {
  return {
    fullName: String(body?.fullName ?? ''),
    specialty: String(body?.specialty ?? ''),
    department: String(body?.department ?? ''),
    contact: String(body?.contact ?? ''),
    login: String(body?.login ?? ''),
    password: body?.password ? String(body.password) : undefined,
    isActive: body?.isActive !== false,
    staffRole: normalizeNurseStaffRole(body?.staffRole),
  };
}

export async function GET(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const items = await listNurseStaffAccounts();
    return NextResponse.json({ items });
  } catch (e) {
    console.error('nurses/staff GET:', e);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body?.id ?? '').trim();
    const input = nurseInputFromBody(body);
    const item = id
      ? await updateNurseStaffAccount({ id, ...input })
      : await createNurseStaffAccount(input);
    return NextResponse.json({ item });
  } catch (e) {
    console.error('nurses/staff POST:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = String(body?.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ error: 'ID majburiy' }, { status: 400 });
    }
    const item = await updateNurseStaffAccount({
      id,
      ...nurseInputFromBody(body),
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('nurses/staff PATCH:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'ID majburiy' }, { status: 400 });
  }
  try {
    await deleteNurseStaffAccount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('nurses/staff DELETE:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
