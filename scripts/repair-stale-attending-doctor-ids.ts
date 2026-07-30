/**
 * Eski/o'chirilgan shifokor user_id lari bilan bog'langan bemorlarni joriy shifokorga bog'laydi.
 * Ishga tushirish: npx tsx scripts/repair-stale-attending-doctor-ids.ts
 */
import { config } from 'dotenv';
import {
  readClinicResourcePayload,
  upsertClinicResourcePayload,
} from '../lib/db/clinic-json-resources';
import { listDoctorsInClinic } from '../lib/db/portal-profiles';
import { getDefaultClinicId } from '../lib/server/default-clinic';

config({ path: '.env.local' });
config({ path: '.env' });

async function main() {
  const clinicId = await getDefaultClinicId();
  const doctors = await listDoctorsInClinic(clinicId);
  const activeIds = new Set(doctors.map((d) => d.user_id));
  const primaryDoctorId = doctors[0]?.user_id;

  if (!primaryDoctorId) {
    console.log('Faol shifokor topilmadi — hech narsa o‘zgartirilmadi.');
    return;
  }

  const payload = await readClinicResourcePayload(clinicId, 'patients');
  if (!Array.isArray(payload)) {
    console.log('patients JSON topilmadi.');
    return;
  }

  let repaired = 0;
  const updated = payload.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const row = item as Record<string, unknown>;
    const attending =
      typeof row.attendingDoctorUserId === 'string' ?
        row.attendingDoctorUserId.trim()
      : '';
    if (attending && !activeIds.has(attending)) {
      repaired += 1;
      return { ...row, attendingDoctorUserId: primaryDoctorId };
    }
    return item;
  });

  if (repaired === 0) {
    console.log('Tuzatish kerak bo‘lgan bemor topilmadi.');
    return;
  }

  await upsertClinicResourcePayload(clinicId, 'patients', updated);
  console.log(`✓ ${repaired} ta bemorda attendingDoctorUserId yangilandi → ${primaryDoctorId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
