export const JSHSHIR_LENGTH = 14;

/** Faqat raqamlar, maksimum 14 ta (kiritish paytida) */
export function sanitizeJshshirInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, JSHSHIR_LENGTH);
}

export function isValidJshshir(value: string): boolean {
  return /^\d{14}$/.test(value);
}

/** Saqlash uchun: faqat raqamlar; 14 ta bo‘lmasa null */
export function normalizeJshshir(value: unknown): string | null {
  const digits =
    typeof value === 'string' || typeof value === 'number' ?
      String(value).replace(/\D/g, '')
    : '';
  if (!digits) return null;
  return isValidJshshir(digits) ? digits : null;
}

export const JSHSHIR_VALIDATION_MESSAGE =
  'JSHSHIR aynan 14 ta raqamdan iborat bo‘lishi kerak';
