import {
  deleteBlockedIp,
  listBlockedIps,
  upsertBlockedIp,
} from '@/lib/db/blocked-ips';
import { requireSuperadminApiSession } from '@/lib/server/require-superadmin-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await requireSuperadminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  try {
    const data = await listBlockedIps(session.clinicId);
    const items = data.map((r) => ({
      _id: r.id,
      ip: r.ip,
      reason: r.reason,
      createdByLogin: r.created_by_login,
      createdAt: r.created_at,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'O‘qib bo‘lmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSuperadminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const ip = typeof body.ip === 'string' ? body.ip.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!ip) {
    return NextResponse.json({ error: 'IP kiriting' }, { status: 400 });
  }
  try {
    await upsertBlockedIp({
      clinicId: session.clinicId,
      ip,
      reason,
      createdByUserId: session.id,
      createdByLogin: session.login || 'admin',
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Saqlanmadi';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireSuperadminApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const ip = typeof body.ip === 'string' ? body.ip.trim() : '';
  if (!ip) {
    return NextResponse.json({ error: 'IP kiriting' }, { status: 400 });
  }
  await deleteBlockedIp(session.clinicId, ip);
  return NextResponse.json({ ok: true });
}
