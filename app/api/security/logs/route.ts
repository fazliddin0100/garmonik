import { listAccessAuditLogs, listSecurityEventLogs } from '@/lib/db/logs';
import { requireSuperadminApiSession } from '@/lib/server/require-superadmin-api';
import { NextRequest, NextResponse } from 'next/server';

function parseDateOrNull(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET(request: NextRequest) {
  const session = await requireSuperadminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const from = parseDateOrNull(sp.get('from'));
  const to = parseDateOrNull(sp.get('to'));
  const actorKind = (sp.get('actorKind') || '').trim();
  const ip = (sp.get('ip') || '').trim();
  const limitRaw = Number.parseInt(sp.get('limit') || '200', 10);
  const limit = Math.max(10, Math.min(Number.isFinite(limitRaw) ? limitRaw : 200, 500));

  try {
    const filters = {
      clinicId: session.clinicId,
      from,
      to,
      actorKind,
      ip,
      limit,
    };

    const [deniedRaw, eventsRaw] = await Promise.all([
      listAccessAuditLogs(filters),
      listSecurityEventLogs(filters),
    ]);

    const denied = deniedRaw.map((r) => ({
      _id: r.id,
      actorKind: r.actor_kind,
      actorLogin: r.actor_login,
      actorRole: r.actor_role,
      routeGroup: r.route_group,
      resourceKey: r.resource_key,
      method: r.method,
      ip: r.ip,
      reason: r.reason,
      createdAt: r.created_at,
    }));

    const events = eventsRaw.map((r) => ({
      _id: r.id,
      eventType: r.event_type,
      actorKind: r.actor_kind,
      actorLogin: r.actor_login,
      actorRole: r.actor_role,
      target: r.target,
      ip: r.ip,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ denied, events });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O‘qib bo‘lmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
