/** URL segment va Mongo `key` maydoni */
export const CLINIC_RESOURCE_KEYS = [
  'patients',
  'departments',
  'rooms',
  'service-types',
  'medical-service-groups',
  'medical-services',
  'service-prices',
  'partners',
  'contracts',
  'pharmacy-products',
  'kitchen-products',
  'kitchen-staff',
  'doctors',
  'nurses',
  'laboratory-staff',
  'reception',
  'pharmacists',
  'admins',
  'clinic-settings',
  'lab-catalog',
  'queue',
  'inpatient-admissions',
  'supply-orders',
  'supply-purchases',
  'kadrlar-employee-profiles',
] as const;

export type ClinicResourceKey = (typeof CLINIC_RESOURCE_KEYS)[number];

export function isClinicResourceKey(s: string): s is ClinicResourceKey {
  return (CLINIC_RESOURCE_KEYS as readonly string[]).includes(s);
}
