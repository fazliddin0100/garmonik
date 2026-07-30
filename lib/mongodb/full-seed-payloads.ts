/**
 * `npm run db:seed` uchun to‘liq demo ma’lumotlar (faqat seed skriptida ishlatiladi).
 * Runtime’da defaultlar bo‘sh — barchasi MongoDBdan.
 */

import type { ClinicResourceKey } from '@/lib/clinic-data/keys';
import { CLINIC_RESOURCE_KEYS } from '@/lib/clinic-data/keys';
import type { AdminUser } from '@/lib/admins/types';
import { INITIAL_DEPARTMENT_GROUPS } from '@/lib/clinic-departments/initial-data';
import { INITIAL_CLINIC_ROOMS } from '@/lib/clinic-rooms/initial-data';
import { INITIAL_CONTRACTS } from '@/lib/contracts/initial-data';
import { INITIAL_DOCTORS } from '@/lib/doctors/initial-data';
import { INITIAL_LAB_CATALOG } from '@/lib/laboratory/catalog-initial-data';
import { INITIAL_LABORATORY_STAFF } from '@/lib/laboratory-staff/initial-data';
import { INITIAL_MEDICAL_SERVICES } from '@/lib/medical-services/initial-data';
import { INITIAL_MEDICAL_SERVICE_GROUPS } from '@/lib/service-groups/initial-data';
import { INITIAL_NURSES } from '@/lib/nurses/initial-data';
import { INITIAL_PARTNERS } from '@/lib/partners/initial-data';
import { INITIAL_PATIENTS } from '@/lib/patients/initial-data';
import { INITIAL_PHARMACISTS } from '@/lib/pharmacists/initial-data';
import { INITIAL_PHARMACY_PRODUCTS } from '@/lib/pharmacy/initial-data';
import { INITIAL_QUEUE } from '@/lib/queue/initial-data';
import { INITIAL_RECEPTION_USERS } from '@/lib/reception/initial-data';
import { DEFAULT_CLINIC_SETTINGS } from '@/lib/settings/types';
import { INITIAL_SERVICE_TYPES } from '@/lib/service-types/initial-data';
import { SERVICE_PRICE_ROWS } from '@/lib/services/pricing-data';

/** Adminlar ro‘yxatida faqat bitta qator — login Mongo `AdminUser` bilan mos (`admin`). */
export function getSeedAdminsJson(): AdminUser[] {
  return [
    {
      id: '1',
      firstName: 'Administrator',
      lastName: 'Sistema',
      fatherName: 'Tizim',
      age: 35,
      username: 'admin',
      roleName: 'Super administrator',
      phone: '+998901112233',
      password: '—',
      securityPin: '1111',
    },
  ];
}

export function getFullSeedPayloads(): Record<ClinicResourceKey, unknown> {
  return {
    patients: structuredClone(INITIAL_PATIENTS),
    departments: structuredClone(INITIAL_DEPARTMENT_GROUPS),
    rooms: structuredClone(INITIAL_CLINIC_ROOMS),
    'service-types': structuredClone(INITIAL_SERVICE_TYPES),
    'medical-service-groups': structuredClone(INITIAL_MEDICAL_SERVICE_GROUPS),
    'medical-services': structuredClone(INITIAL_MEDICAL_SERVICES),
    'service-prices': structuredClone(SERVICE_PRICE_ROWS),
    partners: structuredClone(INITIAL_PARTNERS),
    contracts: structuredClone(INITIAL_CONTRACTS),
    'pharmacy-products': structuredClone(INITIAL_PHARMACY_PRODUCTS),
    doctors: structuredClone(INITIAL_DOCTORS),
    nurses: structuredClone(INITIAL_NURSES),
    'laboratory-staff': structuredClone(INITIAL_LABORATORY_STAFF),
    reception: structuredClone(INITIAL_RECEPTION_USERS),
    pharmacists: structuredClone(INITIAL_PHARMACISTS),
    admins: getSeedAdminsJson(),
    'clinic-settings': structuredClone(DEFAULT_CLINIC_SETTINGS),
    'lab-catalog': structuredClone(INITIAL_LAB_CATALOG),
    queue: structuredClone(INITIAL_QUEUE),
  };
}

export function allClinicResourceKeys(): readonly ClinicResourceKey[] {
  return CLINIC_RESOURCE_KEYS;
}
