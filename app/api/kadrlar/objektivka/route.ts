import { getAdminSessionFromRequest } from '@/lib/auth/request-session';
import { setEmployeeObjektivka } from '@/lib/kadrlar/employee-profiles';
import type { KadrlarStaffKind } from '@/lib/kadrlar/staff-kind';
import { mkdir, writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

function canAccess(
  session: NonNullable<Awaited<ReturnType<typeof getAdminSessionFromRequest>>>,
) {
  return session.routeGroup === 'admin_only' || session.routeGroup === 'hr';
}

const STAFF_KINDS = new Set<KadrlarStaffKind>([
  'doctor',
  'nurse',
  'laboratory',
  'reception',
  'pharmacist',
  'kitchen',
  'office',
]);

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const MAX_BYTES = 15 * 1024 * 1024;

function parseStaffKind(raw: FormDataEntryValue | null): KadrlarStaffKind | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim() as KadrlarStaffKind;
  return STAFF_KINDS.has(value) ? value : null;
}

function extForMime(mime: string): string {
  switch (mime) {
    case 'application/pdf':
      return '.pdf';
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session || !canAccess(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const employeeId =
      typeof formData.get('employeeId') === 'string' ?
        String(formData.get('employeeId')).trim()
      : '';
    const staffKind = parseStaffKind(formData.get('staffKind'));

    if (!(file instanceof File) || !employeeId || !staffKind) {
      return NextResponse.json(
        { error: 'file, employeeId va staffKind kerak' },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Faqat PDF yoki rasm (JPG, PNG, WEBP) yuklang' },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Fayl hajmi 15 MB dan oshmasligi kerak' },
        { status: 400 },
      );
    }

    const ext = extForMime(file.type);
    if (!ext) {
      return NextResponse.json({ error: 'Noto‘g‘ri fayl turi' }, { status: 400 });
    }

    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'kadrlar',
      staffKind,
      safeSegment(employeeId),
    );
    await mkdir(uploadDir, { recursive: true });

    const baseName = safeSegment(
      file.name.replace(/\.[^.]+$/, '') || 'obyektivka',
    );
    const fileName = `${Date.now()}-${baseName}${ext}`;
    const filePathFs = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePathFs, buffer);

    const publicPath = `/uploads/kadrlar/${staffKind}/${safeSegment(employeeId)}/${fileName}`;
    const profile = await setEmployeeObjektivka(
      employeeId,
      staffKind,
      publicPath,
      file.name.trim() || fileName,
    );

    return NextResponse.json({
      message: 'Obyektivka yuklandi',
      profile,
      objektivkaPath: publicPath,
      objektivkaFileName: profile.objektivkaFileName,
    });
  } catch (error) {
    console.error('kadrlar/objektivka POST:', error);
    return NextResponse.json({ error: 'Server xatoligi' }, { status: 500 });
  }
}
