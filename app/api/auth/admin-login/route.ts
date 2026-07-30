import { handleClinicAdminLogin } from '@/lib/server/clinic-admin-login-handler';
import { NextRequest } from 'next/server';

/** Klinika adminlari (super admin bunda kira olmaydi). */
export async function POST(request: NextRequest) {
  return handleClinicAdminLogin(request, '/api/auth/admin-login');
}
