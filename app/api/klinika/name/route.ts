import { createClinic, findClinicByName } from '@/lib/db/clinics';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { clinicName } = await request.json();
    if (!clinicName || typeof clinicName !== 'string') {
      return NextResponse.json({ error: 'Klinika nomi kerak' }, { status: 400 });
    }
    const exists = await findClinicByName(clinicName);
    if (exists) {
      return NextResponse.json(
        { error: `${clinicName} nomli klinika allaqachon mavjud` },
        { status: 409 },
      );
    }
    const row = await createClinic(clinicName);
    return NextResponse.json(
      { ...row, klinikName: row.name, _id: row.id },
      { status: 201 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
