export const APPOINTMENT_REQUEST_STATUSES = [
  'new',
  'confirmed',
  'received',
  'cancelled',
] as const;

export type AppointmentRequestStatus =
  (typeof APPOINTMENT_REQUEST_STATUSES)[number];

export type AppointmentRequestRow = {
  id: string;
  clinic_id: string;
  queue_number: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  disease_type: string;
  preferred_time: string | null;
  status: AppointmentRequestStatus;
  patient_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
};

export const APPOINTMENT_REQUEST_STATUS_LABELS: Record<
  AppointmentRequestStatus,
  string
> = {
  new: 'Yangi',
  confirmed: 'Tasdiqlandi',
  received: 'Qabul qilindi',
  cancelled: 'Bekor qilindi',
};

export function appointmentRequestFullName(row: {
  first_name: string;
  last_name: string;
}): string {
  return [row.last_name, row.first_name].filter(Boolean).join(' ').trim();
}

/** Onlayn navbatda ko‘rinadigan holatlar (klinikaga hali kelmagan) */
export function isOnlineQueueVisibleStatus(
  status: AppointmentRequestStatus,
): boolean {
  return status === 'new' || status === 'confirmed';
}
