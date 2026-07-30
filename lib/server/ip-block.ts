import { isIpBlocked } from '@/lib/db/blocked-ips';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { clientIpFromRequest } from './security-log';

export async function isRequestIpBlocked(request: NextRequest): Promise<boolean> {
  const ip = clientIpFromRequest(request);
  if (!ip) return false;
  try {
    const clinicId = await getDefaultClinicId();
    return isIpBlocked(clinicId, ip);
  } catch {
    return false;
  }
}

export function blockedIpResponse() {
  return NextResponse.json({ error: 'IP bloklangan' }, { status: 403 });
}
