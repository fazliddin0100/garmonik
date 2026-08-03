import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { assistantRespond } from '@/lib/assistant/respond';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { NextRequest, NextResponse } from 'next/server';

async function resolveClinicId(
  session: NonNullable<Awaited<ReturnType<typeof getVerifiedSessionFromRequest>>>,
): Promise<string> {
  if (session.kind === 'admin' || session.kind === 'staff') {
    return session.clinicId;
  }
  return getDefaultClinicId();
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Avval tizimga kiring' }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON noto\'g\'ri' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: 'Xabar bo\'sh yoki juda uzun' }, { status: 400 });
  }

  try {
    const clinicId = await resolveClinicId(session);
    const reply = await assistantRespond({
      message,
      clinicId,
      session,
    });
    return NextResponse.json(reply);
  } catch (e) {
    console.error('assistant/chat:', e);
    return NextResponse.json({ error: 'Javob berib bo\'lmadi' }, { status: 500 });
  }
}
