import { canManageDepartmentStaff } from '@/lib/auth/department-staff-access';
import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  createPharmacistStaffAccount,
  deletePharmacistStaffAccount,
  listPharmacistStaffAccounts,
  updatePharmacistStaffAccount,
} from '@/lib/pharmacists/db-pharmacists';
import { NextRequest, NextResponse } from 'next/server';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Server xatoligi';
}

function canAccess(admin: Awaited<ReturnType<typeof getAdminSessionFromRequest>>) {
  return canManageDepartmentStaff(admin, 'pharmacy');
}

export async function GET(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const items = await listPharmacistStaffAccounts();
    return NextResponse.json({ items });
  } catch (e) {
    console.error('pharmacists/staff GET:', e);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const item = await createPharmacistStaffAccount({
      fullName: String(body?.fullName ?? ''),
      specialty: String(body?.specialty ?? body?.roleName ?? 'Farmatsevt'),
      department: String(body?.department ?? ''),
      login: String(body?.login ?? ''),
      password: body?.password ? String(body.password) : undefined,
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('pharmacists/staff POST:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ error: 'ID majburiy' }, { status: 400 });
    }
    const item = await updatePharmacistStaffAccount({
      id,
      fullName: String(body?.fullName ?? ''),
      specialty: String(body?.specialty ?? body?.roleName ?? 'Farmatsevt'),
      department: String(body?.department ?? ''),
      login: String(body?.login ?? ''),
      password: body?.password ? String(body.password) : undefined,
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('pharmacists/staff PATCH:', e);
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
    await deletePharmacistStaffAccount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('pharmacists/staff DELETE:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
