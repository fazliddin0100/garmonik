import type { NextRequest } from 'next/server';
import { POST as staffPortalLogin } from '@/app/api/staff/login/route';

/** Xodim kabineti — `/api/staff/login` bilan bir xil mantiq. */
export async function POST(request: NextRequest) {
  return staffPortalLogin(request);
}
