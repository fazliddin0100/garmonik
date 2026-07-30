import type { AppointmentRequestStatus } from '@/lib/appointment-requests/types';
import {
  insertAppointmentRequest,
  listAppointmentRequestQueueNumbers,
  type AppointmentRequestRow,
} from '@/lib/db/appointment-requests';
import { isValidUzPhoneE164 } from '@/lib/phone/uz-phone';

export type AppointmentRequestCreateInput = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  diseaseType: string;
  preferredTime: string | null;
  source: string;
};

function normalizeText(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function nextAppointmentRequestQueueNumber(existing: string[]): string {
  const prefix = `AR-${new Date().getFullYear()}-`;
  const max = existing.reduce((acc, cur) => {
    if (!cur.startsWith(prefix)) return acc;
    const n = Number.parseInt(cur.slice(prefix.length), 10);
    if (!Number.isFinite(n)) return acc;
    return Math.max(acc, n);
  }, 0);
  return `${prefix}${String(max + 1).padStart(5, '0')}`;
}

export function parseAppointmentRequestCreateBody(
  body: unknown,
): AppointmentRequestCreateInput | { error: string } {
  const raw = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const firstName = normalizeText(raw.firstName);
  const lastName = normalizeText(raw.lastName);
  const phone = normalizeText(raw.phone);
  const address = normalizeText(raw.address);
  const diseaseType = normalizeText(raw.diseaseType);
  const preferredTime = normalizeText(raw.preferredTime) || null;
  const source = normalizeText(raw.source) || 'instagram';

  if (!firstName || !lastName) {
    return { error: 'Ism va familiya majburiy' };
  }
  if (!isValidUzPhoneE164(phone)) {
    return {
      error: 'Telefon raqamini to‘liq kiriting: +998 (XX) XXX-XX-XX',
    };
  }
  if (!address) {
    return { error: 'Yashash manzili majburiy' };
  }
  if (!diseaseType) {
    return { error: 'Murojaat sababi yoki kasallik turini kiriting' };
  }

  return {
    firstName,
    lastName,
    phone,
    address,
    diseaseType,
    preferredTime,
    source,
  };
}

export async function createAppointmentRequestForClinic(
  clinicId: string,
  input: AppointmentRequestCreateInput,
): Promise<AppointmentRequestRow> {
  const existingNumbers = await listAppointmentRequestQueueNumbers(clinicId);
  const queueNumber = nextAppointmentRequestQueueNumber(existingNumbers);
  const now = new Date().toISOString();

  return insertAppointmentRequest({
    clinic_id: clinicId,
    queue_number: queueNumber,
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    address: input.address,
    disease_type: input.diseaseType,
    preferred_time: input.preferredTime,
    status: 'new' satisfies AppointmentRequestStatus,
    source: input.source,
    updated_at: now,
  });
}
