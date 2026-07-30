export const APPOINTMENT_REQUESTS_CHANGED_EVENT =
  'garmonik:appointment-requests-changed';

export function notifyAppointmentRequestsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(APPOINTMENT_REQUESTS_CHANGED_EVENT));
}
