import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import type { VerifiedSession } from '@/lib/auth/session-jwt';
import { adminCanAccessClinicResource } from '@/lib/admins/portal-routes';
import { isClinicResourceKey, type ClinicResourceKey } from '@/lib/clinic-data/keys';
import { logClinicDataDeniedAccess } from '@/lib/server/audit-log';
import { blockedIpResponse, isRequestIpBlocked } from '@/lib/server/ip-block';
import { logSecurityEvent } from '@/lib/server/security-log';
import { readClinicResource, writeClinicResource } from '@/lib/server/clinic-resource-service';
import { NextRequest, NextResponse } from 'next/server';

function canAccessResource(
  session: VerifiedSession | null,
  key: ClinicResourceKey,
  method: 'GET' | 'PUT',
): boolean {
  if (!session) return false;
  if (session.kind === 'admin') {
    return adminCanAccessClinicResource(session.routeGroup, key, method);
  }
  if (session.kind === 'staff') {
    if (session.role === 'head_nurse') {
      if (
        (method === 'GET' || method === 'PUT') &&
        (key === 'patients' || key === 'rooms' || key === 'inpatient-admissions')
      ) {
        return true;
      }
    }
    if (
      method === 'GET' &&
      (key === 'patients' ||
        key === 'lab-catalog' ||
        key === 'queue' ||
        key === 'service-prices' ||
        (key === 'inpatient-admissions' &&
          (session.role === 'doctor' || session.role === 'shifokor')) ||
        (key === 'pharmacy-products' &&
          (session.role === 'doctor' ||
            session.role === 'shifokor' ||
            session.role === 'head_nurse')))
    ) {
      return true;
    }
    if (method === 'PUT' && key === 'patients') return true;
    if (method === 'PUT' && key === 'queue') return true;
    if (method === 'PUT' && key === 'lab-catalog' && session.role === 'laboratory') {
      return true;
    }
  }
  return false;
}

type Ctx = { params: Promise<{ key: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  if (await isRequestIpBlocked(request)) {
    return blockedIpResponse();
  }
  const { key: raw } = await ctx.params;
  if (!isClinicResourceKey(raw)) {
    await logClinicDataDeniedAccess({
      request,
      session: null,
      resourceKey: String(raw),
      method: 'GET',
      reason: 'invalid_resource_key',
    });
    return NextResponse.json({ error: 'Noto‘g‘ri kalit' }, { status: 404 });
  }
  const session = await getVerifiedSessionFromRequest(request);
  if (!canAccessResource(session, raw, 'GET')) {
    await logClinicDataDeniedAccess({
      request,
      session,
      resourceKey: raw,
      method: 'GET',
      reason: 'access_denied_by_role',
    });
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  try {
    const data = await readClinicResource(raw);
    return NextResponse.json({ data });
  } catch (e) {
    console.error('clinic-data GET', raw, e);
    return NextResponse.json({ error: 'O‘qib bo‘lmadi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  if (await isRequestIpBlocked(request)) {
    return blockedIpResponse();
  }
  const { key: raw } = await ctx.params;
  if (!isClinicResourceKey(raw)) {
    await logClinicDataDeniedAccess({
      request,
      session: null,
      resourceKey: String(raw),
      method: 'PUT',
      reason: 'invalid_resource_key',
    });
    return NextResponse.json({ error: 'Noto‘g‘ri kalit' }, { status: 404 });
  }
  const session = await getVerifiedSessionFromRequest(request);
  if (!canAccessResource(session, raw, 'PUT')) {
    await logClinicDataDeniedAccess({
      request,
      session,
      resourceKey: raw,
      method: 'PUT',
      reason: 'access_denied_by_role',
    });
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }
  try {
    const body = await request.json();
    await writeClinicResource(raw, body);
    await logSecurityEvent({
      request,
      session,
      eventType: 'clinic_data_write',
      target: `/api/clinic-data/${raw}`,
      meta: { key: raw },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Saqlab bo‘lmadi';
    console.error('clinic-data PUT', raw, e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
