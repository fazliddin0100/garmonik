import type { ClinicResourceKey } from './keys';

/**
 * MongoDBda `ClinicJsonResource` yozuvi bo‘lmaganda qaytariladigan bo‘sh/yengil qiymatlar.
 * Demo ma’lumotlar faqat `npm run db:seed` orqali bazaga yoziladi.
 */
export function defaultPayloadForKey(key: ClinicResourceKey): unknown {
  switch (key) {
    case 'clinic-settings':
      return {};
    case 'patients':
    case 'departments':
    case 'rooms':
    case 'service-types':
    case 'medical-service-groups':
    case 'medical-services':
    case 'service-prices':
    case 'partners':
    case 'contracts':
    case 'pharmacy-products':
    case 'kitchen-products':
    case 'kitchen-staff':
    case 'doctors':
    case 'nurses':
    case 'laboratory-staff':
    case 'reception':
    case 'pharmacists':
    case 'admins':
    case 'lab-catalog':
    case 'queue':
    case 'inpatient-admissions':
    case 'supply-orders':
    case 'supply-purchases':
      return [];
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
