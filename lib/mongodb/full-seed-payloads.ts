/**
 * `npm run db:seed` — bo‘sh resurslar (demo ma’lumot yo‘q).
 * Kontent faqat admin tomonidan kiritiladi.
 */

import type { ClinicResourceKey } from '@/lib/clinic-data/keys';
import { CLINIC_RESOURCE_KEYS } from '@/lib/clinic-data/keys';
import type { AdminUser } from '@/lib/admins/types';
import { DEFAULT_CLINIC_SETTINGS } from '@/lib/settings/types';

export function getSeedAdminsJson(): AdminUser[] {
  return [];
}

export function getFullSeedPayloads(): Record<ClinicResourceKey, unknown> {
  return {
    patients: [],
    departments: [],
    rooms: [],
    'service-types': [],
    'medical-service-groups': [],
    'medical-services': [],
    'service-prices': [],
    partners: [],
    contracts: [],
    'pharmacy-products': [],
    doctors: [],
    nurses: [],
    'laboratory-staff': [],
    reception: [],
    pharmacists: [],
    admins: getSeedAdminsJson(),
    'clinic-settings': structuredClone(DEFAULT_CLINIC_SETTINGS),
    'lab-catalog': [],
    queue: [],
    'inpatient-admissions': [],
    'supply-orders': [],
    'supply-purchases': [],
  };
}

export function allClinicResourceKeys(): readonly ClinicResourceKey[] {
  return CLINIC_RESOURCE_KEYS;
}
