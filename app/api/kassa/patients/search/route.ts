import { searchPatientsForKassa } from '@/lib/db/patients';
import { requireSession } from '@/lib/kassa/auth';
import {
  ensureKassaPatientForGarmonik,
  mapGarmonikRowsForKassaSearch,
  type KassaPatientSearchHit,
} from '@/lib/kassa/patient-bridge';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const clinicId = await getDefaultClinicId();
    const rows = await searchPatientsForKassa(clinicId, q);
    const hits = await mapGarmonikRowsForKassaSearch(rows);

    const synced: KassaPatientSearchHit[] = [];
    for (const hit of hits) {
      if (hit.kassaPatientId) {
        synced.push(hit);
        continue;
      }
      const row = rows.find((r) => String(r.id) === hit.garmonikPatientId);
      if (!row) {
        synced.push(hit);
        continue;
      }
      const kassaPatient = await ensureKassaPatientForGarmonik({
        id: String(row.id),
        full_name: String(row.full_name),
        phone: String(row.phone ?? ''),
        birth_date: row.birth_date ? String(row.birth_date) : null,
      });
      synced.push({ ...hit, kassaPatientId: kassaPatient.id });
    }

    return NextResponse.json(synced);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Qidiruv xatosi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
