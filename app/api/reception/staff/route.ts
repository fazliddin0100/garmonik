import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  createReceptionStaffAccount,
  deleteReceptionStaffAccount,
  listReceptionStaffAccounts,
  updateReceptionStaffAccount,
} from '@/lib/reception/db-reception-staff';
import { NextRequest, NextResponse } from 'next/server';

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Server xatoligi';
}

export async function GET(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  try {
    const items = await listReceptionStaffAccounts();
    return NextResponse.json({ items });
  } catch (e) {
    console.error('reception/staff GET:', e);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const item = await createReceptionStaffAccount({
      fullName: String(body?.fullName ?? ''),
      roleName: String(body?.roleName ?? ''),
      department: body?.department ? String(body.department) : undefined,
      login: String(body?.login ?? ''),
      password: body?.password ? String(body.password) : undefined,
      email: body?.email ? String(body.email) : undefined,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('reception/staff POST:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const id = String(body?.id ?? '').trim();
    if (!id) {
      return NextResponse.json({ error: 'ID majburiy' }, { status: 400 });
    }
    const item = await updateReceptionStaffAccount({
      id,
      fullName: String(body?.fullName ?? ''),
      roleName: String(body?.roleName ?? ''),
      department: body?.department ? String(body.department) : undefined,
      login: String(body?.login ?? ''),
      password: body?.password ? String(body.password) : undefined,
      email: body?.email ? String(body.email) : undefined,
    });
    return NextResponse.json({ item });
  } catch (e) {
    console.error('reception/staff PATCH:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get('id')?.trim();
  if (!id) {
    return NextResponse.json({ error: 'ID majburiy' }, { status: 400 });
  }
  try {
    await deleteReceptionStaffAccount(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('reception/staff DELETE:', e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
