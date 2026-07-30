import {
  formatUzPhoneDisplay as clinicFormatUzPhoneDisplay,
  isValidUzPhoneE164,
  uzNationalDigits,
  uzPhoneE164FromNational,
} from '@/lib/phone/uz-phone';

const UZ_PHONE_DIGITS = 9;

/** @deprecated uzNationalDigits ishlating */
export function extractUzPhoneDigits(value: string) {
  return uzNationalDigits(value);
}

/** Milliy qism: (90) 123-45-67 */
export function formatUzPhoneDisplay(value: string) {
  const digits = uzNationalDigits(value);
  if (!digits) return '';

  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 5) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
}

/** To'liq ko'rinish: +998 (90) 123-45-67 */
export function formatUzPhoneDisplayFull(value: string) {
  return clinicFormatUzPhoneDisplay(value);
}

export function toUzPhoneE164(value: string) {
  return uzPhoneE164FromNational(uzNationalDigits(value));
}

export function isValidUzPhone(value: string) {
  const e164 = toUzPhoneE164(value);
  return e164 ? isValidUzPhoneE164(e164) : false;
}

/** Navbat/DB dan kelgan har qanday formatni E.164 ga */
export function resolveUzPhoneE164(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (!value?.trim()) continue;
    const e164 = toUzPhoneE164(value);
    if (isValidUzPhoneE164(e164)) return e164;
  }
  return undefined;
}

export { UZ_PHONE_DIGITS };
