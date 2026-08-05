import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { updateClinicLogo } from '@/lib/db/clinics';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { mkdir, writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

function canUploadLogo(
  session: Awaited<ReturnType<typeof getAdminSessionFromRequest>>,
): boolean {
  if (!session) return false;
  return session.routeGroup === 'admin_only' || session.routeGroup === 'it';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session || !canUploadLogo(session)) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
    }

    const formData = await request.formData();
    const logo = formData.get('logo') as File | null;
    const clinicId = formData.get('clinicId') as string | null;
    if (!logo || !clinicId) {
      return NextResponse.json(
        { error: 'Logo va clinicId kiritilishi shart' },
        { status: 400 },
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(logo.type)) {
      return NextResponse.json(
        { error: 'Faqat PNG yoki JPG formatida yuklang' },
        { status: 400 },
      );
    }

    if (logo.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fayl hajmi 15 MB dan oshmasligi kerak' },
        { status: 400 },
      );
    }

    const defaultId = await getDefaultClinicId();
    if (String(clinicId) !== String(defaultId)) {
      return NextResponse.json({ error: 'Klinika topilmadi' }, { status: 404 });
    }

    // Session klinikasi bilan mos kelishi shart
    if (String(session.clinicId) !== String(clinicId)) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'logo');
    await mkdir(uploadDir, { recursive: true });

    const ext = logo.type === 'image/png' ? '.png' : '.jpg';
    const fileName = `${clinicId}${ext}`;
    const filePathFs = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await logo.arrayBuffer());
    await writeFile(filePathFs, buffer);

    const logoPath = `/logo/${fileName}`;

    await updateClinicLogo(clinicId, logoPath);

    return NextResponse.json(
      { message: 'Logo muvaffaqiyatli yuklandi!', logoPath },
      { status: 200 },
    );
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
