import { handleClinicAdminLogin } from '@/lib/server/clinic-admin-login-handler';
import { NextRequest } from 'next/server';

/** Eski klientlar uchun; mantiq `/api/auth/admin-login` bilan bir xil. */
export async function POST(request: NextRequest) {
  return handleClinicAdminLogin(request, '/api/auth/superadmin-login');
}
