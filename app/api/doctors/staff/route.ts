import { canManageDepartmentStaff } from '@/lib/auth/department-staff-access';
import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  createDoctorStaffAccount,
  deleteDoctorStaffAccount,
  listDoctorStaffAccounts,
  updateDoctorStaffAccount,
} from '@/lib/doctors/db-doctors';
import { NextRequest, NextResponse } from 'next/server';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Server xatoligi';
}

function canAccess(admin: Awaited<ReturnType<typeof getAdminSessionFromRequest>>) {
  return canManageDepartmentStaff(admin, 'clinical');
}

export async function GET(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!canAccess(admin)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const items = await listDoctorStaffAccounts();
    return NextResponse.json({ items });
  } catch (e) {
    console.error('doctors/staff GET:', e);
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
    const item = await createDoctorStaffAccount({
      fullName: String(body?.fullName ?? ''),
      specialty: String(body?.specialty ?? ''),
      department: String(body?.department ?? ''),
      contact: body?.contact ? String(body.contact) : undefined,
      code: body?.code ? String(body.code) : undefined,
      roomNumber: body?.roomNumber ? String(body.roomNumber) : undefined,
      degree: body?.degree ? String(body.degree) : undefined,
      position: body?.position ? String(body.position) : undefined,
      login: String(body?.login ?? ''),
      password: body?.password ? String(body.password) : undefined,
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('doctors/staff POST:', e);
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
    const item = await updateDoctorStaffAccount({
      id,
      fullName: String(body?.fullName ?? ''),
      specialty: String(body?.specialty ?? ''),
      department: String(body?.department ?? ''),
      contact: body?.contact ? String(body.contact) : undefined,
      code: body?.code ? String(body.code) : undefined,
      roomNumber: body?.roomNumber ? String(body.roomNumber) : undefined,
      degree: body?.degree ? String(body.degree) : undefined,
      position: body?.position ? String(body.position) : undefined,
      login: String(body?.login ?? ''),
      password: body?.password ? String(body.password) : undefined,
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('doctors/staff PATCH:', e);
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
    await deleteDoctorStaffAccount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('doctors/staff DELETE:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
