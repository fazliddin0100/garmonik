export const UZ_PHONE_PREFIX = '+998';

export const UZ_PHONE_E164_REGEX = /^\+998\d{9}$/;

/** +998 dan keyingi 9 ta milliy raqam. */
export function uzNationalDigits(phone: string): string {
  const t = phone.trim();
  if (!t) return '';
  const digits = t.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits.slice(3, 12);
  return digits.slice(0, 9);
}

/** Saqlash uchun: +998901234567 */
export function uzPhoneE164FromNational(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  return d ? `${UZ_PHONE_PREFIX}${d}` : '';
}

/** Milliy qism: (90) 123-45-67 */
export function formatUzPhoneNational(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 9);
  if (!d) return '';

  const op = d.slice(0, 2);
  const block = d.slice(2, 5);
  const part1 = d.slice(5, 7);
  const part2 = d.slice(7, 9);

  if (d.length === 1) return `(${op}`;
  if (d.length === 2) return `(${op})`;

  let out = `(${op}) ${block}`;
  if (d.length > 5) out += `-${part1}`;
  if (d.length > 7) out += `-${part2}`;
  return out;
}

/** Ko‘rsatish: +998 (90) 123-45-67 */
export function formatUzPhoneDisplay(phone: string): string {
  const d = uzNationalDigits(phone);
  if (!d) return '';
  return `${UZ_PHONE_PREFIX} ${formatUzPhoneNational(d)}`;
}

export function isValidUzPhoneE164(phone: string): boolean {
  return UZ_PHONE_E164_REGEX.test(phone.trim());
}
