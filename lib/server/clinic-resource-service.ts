import { defaultPayloadForKey } from '@/lib/clinic-data/defaults-registry';
import type { ClinicResourceKey } from '@/lib/clinic-data/keys';
import { validateClinicResourcePayload } from '@/lib/clinic-data/validate-payload';
import {
  readClinicResourcePayload,
  upsertClinicResourcePayload,
} from '@/lib/db/clinic-json-resources';
import { INITIAL_PHARMACY_PRODUCTS } from '@/lib/pharmacy/initial-data';
import {
  mergePharmacyCatalog,
  type PharmacyProduct,
} from '@/lib/pharmacy/types';
import {
  readClinicQueueRows,
  syncQueueAfterInpatientAdmissionsWrite,
  writeClinicQueueRows,
} from '@/lib/queue/clinic-queue-store';
import { normalizeQueueRow, type QueueRow } from '@/lib/queue/types';
import { getDefaultClinicId } from './default-clinic';

export async function readClinicResource(key: ClinicResourceKey): Promise<unknown> {
  const clinicId = await getDefaultClinicId();

  if (key === 'queue') {
    return readClinicQueueRows(clinicId);
  }

  const payload = await readClinicResourcePayload(clinicId, key);

  if (key === 'pharmacy-products') {
    const existing = Array.isArray(payload) ? (payload as PharmacyProduct[]) : [];
    const { products, added } = mergePharmacyCatalog(
      existing,
      INITIAL_PHARMACY_PRODUCTS,
    );
    if (added > 0) {
      try {
        await upsertClinicResourcePayload(clinicId, key, products);
      } catch (e) {
        console.error('pharmacy-products auto-seed', e);
      }
    }
    return products;
  }

  if (payload !== undefined && payload !== null) return payload;
  return defaultPayloadForKey(key);
}

export async function writeClinicResource(
  key: ClinicResourceKey,
  payload: unknown,
): Promise<void> {
  validateClinicResourcePayload(key, payload);
  const clinicId = await getDefaultClinicId();

  if (key === 'queue') {
    const rows = Array.isArray(payload) ?
      (payload as QueueRow[]).map((row) => normalizeQueueRow(row))
    : [];
    await writeClinicQueueRows(clinicId, rows);
    return;
  }

  await upsertClinicResourcePayload(clinicId, key, payload);

  if (key === 'inpatient-admissions') {
    await syncQueueAfterInpatientAdmissionsWrite(clinicId, payload);
  }
}
