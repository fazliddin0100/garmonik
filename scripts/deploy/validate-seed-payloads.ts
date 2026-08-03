/**
 * Seed payload kalitlari to'liqligini tekshirish.
 */
import { CLINIC_RESOURCE_KEYS } from '@/lib/clinic-data/keys';
import { validateClinicResourcePayload } from '@/lib/clinic-data/validate-payload';
import { getFullSeedPayloads } from '@/lib/mongodb/full-seed-payloads';

function main() {
  const payloads = getFullSeedPayloads();
  let failed = 0;

  for (const key of CLINIC_RESOURCE_KEYS) {
    if (!(key in payloads)) {
      console.error(`[FAIL] getFullSeedPayloads(): "${key}" yo'q`);
      failed++;
      continue;
    }
    try {
      validateClinicResourcePayload(key, payloads[key]);
      console.log(`[OK] ${key}`);
    } catch (e) {
      console.error(`[FAIL] ${key}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed} ta seed muammosi`);
    process.exit(1);
  }

  console.log('\nBarcha seed payload kalitlari tayyor.');
}

main();
