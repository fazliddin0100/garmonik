import { requireSession } from '@/lib/kassa/auth';
import { listKassaPaymentQueue } from '@/lib/kassa/payment-queue';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const items = await listKassaPaymentQueue();
    return NextResponse.json(items);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Navbat yuklanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
