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
      name: clinic?.name?.trim() || '',
      logoPath: clinic?.logo_file_path?.trim() || '',
    });
  } catch {
    return NextResponse.json({
      name: '',
      logoPath: '',
    });
  }
}
