import type { AssistantCapability } from '@/lib/assistant/capabilities';

export type QueryIntent =
  | 'inpatients_active'
  | 'inpatients_discharged'
  | 'patients_total'
  | 'queue'
  | 'queue_doctor'
  | 'kassa_today'
  | 'appointments'
  | 'staff_services'
  | 'overview'
  | 'own_activity'
  | 'my_permissions';

export const INTENT_REQUIRED: Record<QueryIntent, AssistantCapability[]> = {
  inpatients_active: ['inpatients'],
  inpatients_discharged: ['inpatients'],
  patients_total: ['patients_all', 'patients_own'],
  queue: ['queue_all', 'queue_scope'],
  queue_doctor: ['queue_all', 'queue_scope'],
  kassa_today: ['kassa_clinic_today', 'kassa_own_today'],
  appointments: ['appointments_all'],
  staff_services: ['staff_directory', 'clinic_overview'],
  overview: ['clinic_overview', 'kassa_own_today', 'queue_scope', 'patients_own'],
  own_activity: ['own_activity'],
  my_permissions: ['permissions_view'],
};
