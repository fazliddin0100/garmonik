import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import type { VerifiedSession } from '@/lib/auth/session-jwt';
import {
  readClinicResource,
  writeClinicResource,
} from '@/lib/server/clinic-resource-service';
import { blockedIpResponse, isRequestIpBlocked } from '@/lib/server/ip-block';
import { logSecurityEvent } from '@/lib/server/security-log';
import type { SupplyOrder, SupplyOrderSource } from '@/lib/supply/types';
import { NextRequest, NextResponse } from 'next/server';

function canCreateSupplyOrder(session: VerifiedSession | null): boolean {
  if (!session) return false;
  if (
    session.kind === 'staff' &&
    (session.role === 'oshpaz' || session.role === 'farmatsevt')
  ) {
    return true;
  }
  if (session.kind === 'admin') {
    return (
      session.routeGroup === 'kitchen' ||
      session.routeGroup === 'pharmacy' ||
      session.routeGroup === 'supply' ||
      session.routeGroup === 'admin_only'
    );
  }
  return false;
}

function resolveSource(
  session: VerifiedSession,
  bodySource: unknown,
): SupplyOrderSource {
  if (bodySource === 'kitchen' || bodySource === 'pharmacy' || bodySource === 'clinic') {
    return bodySource;
  }
  if (session.kind === 'staff') {
    if (session.role === 'farmatsevt') return 'pharmacy';
    if (session.role === 'oshpaz') return 'kitchen';
  }
  if (session.kind === 'admin') {
    if (session.routeGroup === 'pharmacy') return 'pharmacy';
    if (session.routeGroup === 'kitchen') return 'kitchen';
  }
  return 'clinic';
}

function defaultRequestedBy(
  source: SupplyOrderSource,
  actorName: string,
): string {
  if (source === 'kitchen') return `Oshxona · ${actorName || 'Oshpaz'}`;
  if (source === 'pharmacy') return `Dorixona · ${actorName || 'Farmatsevt'}`;
  return actorName || 'Klinika';
}

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Oshxona / dorixona / Ta'minot buyurtmasini serverda qo'shadi
 * (to'liq massivni client overwrite qilmasligi uchun).
 */
export async function POST(request: NextRequest) {
  if (await isRequestIpBlocked(request)) {
    return blockedIpResponse();
  }

  const session = await getVerifiedSessionFromRequest(request);
  if (!canCreateSupplyOrder(session) || !session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 });
  }

  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const productName =
    typeof b.productName === 'string' ? b.productName.trim() : '';
  const quantity = Number(b.quantity);
  const unit =
    typeof b.unit === 'string' && b.unit.trim() ? b.unit.trim() : 'dona';
  const note = typeof b.note === 'string' ? b.note.trim() : '';
  const requestedByRaw =
    typeof b.requestedBy === 'string' ? b.requestedBy.trim() : '';
  const source = resolveSource(session, b.source);

  if (!productName) {
    return NextResponse.json(
      { error: 'Mahsulot nomini kiriting' },
      { status: 400 },
    );
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Miqdor noto‘g‘ri' }, { status: 400 });
  }

  const actorName =
    session.kind === 'admin' ? (session.displayName || session.login).trim()
    : session.kind === 'staff' ? (session.fullName || session.login).trim()
    : '';
  const requestedBy =
    requestedByRaw || defaultRequestedBy(source, actorName);

  const now = new Date().toISOString();
  const order: SupplyOrder = {
    id: newId(),
    productName,
    quantity,
    unit,
    note,
    requestedBy,
    source,
    status: 'yangi',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const raw = await readClinicResource('supply-orders');
    const existing = Array.isArray(raw) ? (raw as SupplyOrder[]) : [];
    const next = [order, ...existing.filter((o) => o && o.id !== order.id)];
    await writeClinicResource('supply-orders', next);

    await logSecurityEvent({
      request,
      session,
      eventType: 'clinic_data_write',
      target: '/api/supply/orders',
      meta: { key: 'supply-orders', source: order.source },
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (e) {
    console.error('supply/orders POST:', e);
    return NextResponse.json(
      { error: 'Buyurtma saqlanmadi' },
      { status: 500 },
    );
  }
}
