import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import {
  isKassaModuleId,
  type KassaModuleId,
} from '@/lib/kassa/data-modules/catalog';
import {
  exportKassaModule,
  importKassaModule,
} from '@/lib/kassa/data-modules/service';
import { logSecurityEvent } from '@/lib/server/security-log';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ module: string }> };

function canExport(session: Awaited<ReturnType<typeof getAdminSessionFromRequest>>) {
  if (!session) return false;
  return session.routeGroup === 'admin_only' || session.routeGroup === 'finance';
}

function canImport(session: Awaited<ReturnType<typeof getAdminSessionFromRequest>>) {
  if (!session) return false;
  return session.routeGroup === 'admin_only';
}

function parseBodyData(body: unknown): unknown {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>;
    if ('data' in obj) return obj.data;
    if ('items' in obj) return obj.items;
  }
  return body;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionFromRequest(_request);
  if (!canExport(session)) {
    return NextResponse.json({ error: 'Ruxsat yo\'q' }, { status: 403 });
  }

  const { module: raw } = await ctx.params;
  if (!isKassaModuleId(raw)) {
    return NextResponse.json({ error: 'Noto\'g\'ri kassa moduli' }, { status: 404 });
  }

  try {
    const data = await exportKassaModule(raw as KassaModuleId);
    return NextResponse.json({ data });
  } catch (e) {
    console.error('kassa module export', raw, e);
    return NextResponse.json({ error: 'Eksport muvaffaqiyatsiz' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionFromRequest(request);
  if (!canImport(session)) {
    return NextResponse.json(
      { error: 'Faqat klinika direktori import qila oladi' },
      { status: 403 },
    );
  }

  const { module: raw } = await ctx.params;
  if (!isKassaModuleId(raw)) {
    return NextResponse.json({ error: 'Noto\'g\'ri kassa moduli' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON noto\'g\'ri' }, { status: 400 });
  }

  const data = parseBodyData(body);

  try {
    const result = await importKassaModule(raw as KassaModuleId, data);
    await logSecurityEvent({
      request,
      session,
      eventType: 'clinic_data_write',
      target: `/api/admin/data-modules/kassa/${raw}`,
      meta: { module: raw, ...result },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Import muvaffaqiyatsiz';
    console.error('kassa module import', raw, e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
