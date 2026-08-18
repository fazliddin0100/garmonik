import type { ClinicResourceKey } from './keys';
import { INITIAL_PHARMACY_PRODUCTS } from '@/lib/pharmacy/initial-data';

/**
 * MongoDBda `ClinicJsonResource` yozuvi bo‘lmaganda qaytariladigan bo‘sh/yengil qiymatlar.
 * Demo ma’lumotlar faqat `npm run db:seed` orqali bazaga yoziladi.
 * `pharmacy-products` — katalog kod bilan birga keladi (VPS pull uchun).
 */
export function defaultPayloadForKey(key: ClinicResourceKey): unknown {
  switch (key) {
    case 'clinic-settings':
      return {};
    case 'pharmacy-products':
      return structuredClone(INITIAL_PHARMACY_PRODUCTS);
    case 'patients':
    case 'departments':
    case 'rooms':
    case 'service-types':
    case 'medical-service-groups':
    case 'medical-services':
    case 'service-prices':
    case 'partners':
    case 'contracts':
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
    case 'kadrlar-employee-profiles':
      return [];
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
