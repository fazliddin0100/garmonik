import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { listLaboratoryQueue } from '@/lib/queue/laboratory-queue';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!session || session.kind !== 'staff') {
    return NextResponse.json({ error: 'Ruxsat yoq' }, { status: 403 });
  }

  if (session.role !== 'laboratory') {
    return NextResponse.json({ error: 'Faqat laboratoriya uchun' }, { status: 403 });
  }

  try {
    const items = await listLaboratoryQueue();
    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Navbat yuklanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
