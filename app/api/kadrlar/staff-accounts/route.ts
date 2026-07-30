import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  listKadrlarEmployees,
  replaceKadrlarEmployees,
  type KadrlarEmployeeInput,
} from '@/lib/kadrlar/db-employees';
import { isKadrlarRoleKey } from '@/lib/kadrlar/roles';
import { NextRequest, NextResponse } from 'next/server';

function isKadrlarAccount(x: unknown): x is KadrlarEmployeeInput {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.login === 'string' &&
    typeof o.passwordHash === 'string' &&
    typeof o.fullName === 'string' &&
    typeof o.role === 'string' &&
    isKadrlarRoleKey(o.role) &&
    typeof o.department === 'string' &&
    typeof o.isActive === 'boolean' &&
    typeof o.createdAt === 'string' &&
    (o.plainPassword === undefined || typeof o.plainPassword === 'string')
  );
}

/** Admin JWT (cookie) bilan — kadrlar xodimlarini Supabase bilan sinxronlash */
export async function GET(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  try {
    const accounts = await listKadrlarEmployees();
    return NextResponse.json({ accounts });
  } catch (e) {
    console.error('staff-accounts GET:', e);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await getAdminSessionFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const raw = body?.accounts;
    if (!Array.isArray(raw) || !raw.every(isKadrlarAccount)) {
      return NextResponse.json({ error: 'Noto‘g‘ri ma’lumot' }, { status: 400 });
    }
    await replaceKadrlarEmployees(raw);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('staff-accounts PUT:', e);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
