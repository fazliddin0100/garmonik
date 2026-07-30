import { queryOne } from '@/lib/db/query';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const clinicId = await getDefaultClinicId();
    const clinic = await queryOne<{ name: string; logo_file_path: string | null }>(
      `select name, logo_file_path from public.clinics where id = $1`,
      [clinicId],
    );
    return NextResponse.json({
      name: clinic?.name ?? 'Gormonik Plus Klinikasi',
      logoPath: clinic?.logo_file_path ?? '/garmonik-logo-user.png',
    });
  } catch {
    return NextResponse.json({
      name: 'Gormonik Plus Klinikasi',
      logoPath: '/garmonik-logo-user.png',
    });
  }
}
