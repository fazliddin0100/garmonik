import { handleClinicAdminLogin } from '@/lib/server/clinic-admin-login-handler';
import { NextRequest } from 'next/server';

/** @deprecated Oddiy `/api/auth/admin-login` */
export async function POST(request: NextRequest) {
  return handleClinicAdminLogin(request, '/api/login');
}
