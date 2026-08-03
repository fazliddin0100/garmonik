import { isPageOpenRequest, wantsNavigation } from '@/lib/assistant/navigation';

export type PersonPageRole =
  | 'doctor'
  | 'patient'
  | 'nurse'
  | 'staff'
  | 'user';

export type PersonPageIntent = {
  role: PersonPageRole;
  nameQuery: string;
};

const ROLE_ALIASES: { role: PersonPageRole; pattern: RegExp }[] = [
  { role: 'doctor', pattern: /\b(?:shifokor|doktor|doctor)\b/i },
  { role: 'patient', pattern: /\b(?:bemor|bemorlar|patient)\b/i },
  { role: 'nurse', pattern: /\b(?:hamshira|hamshiralar|nurse)\b/i },
  { role: 'staff', pattern: /\b(?:xodim|kadrlar|xodimlar)\b/i },
  { role: 'user', pattern: /\b(?:foydalanuvchi|user|administrator|admin)\b/i },
];

export function parsePersonPageIntent(text: string): PersonPageIntent | null {
  if (!isPageOpenRequest(text) && !wantsNavigation(text)) return null;

  const roleFromLabel = ROLE_ALIASES.find((r) => r.pattern.test(text))?.role;

  const patterns: { role: PersonPageRole; re: RegExp }[] = [
    {
      role: 'doctor',
      re: /\b(?:shifokor|doktor|doctor)\s+([a-z0-9\u0400-\u04FF'`-]+?)(?:ning|\s+(?:sahifa|kabinet|profil))/i,
    },
    {
      role: 'patient',
      re: /\b(?:bemor)\s+([a-z0-9\u0400-\u04FF'`-]+?)(?:ning|\s+(?:sahifa|karta|kartochka|profil))/i,
    },
    {
      role: 'nurse',
      re: /\b(?:hamshira)\s+([a-z0-9\u0400-\u04FF'`-]+?)(?:ning|\s+(?:sahifa|profil))/i,
    },
    {
      role: 'staff',
      re: /\b(?:xodim)\s+([a-z0-9\u0400-\u04FF'`-]+?)(?:ning|\s+(?:sahifa|profil))/i,
    },
    {
      role: roleFromLabel ?? 'user',
      re: /\b([a-z0-9\u0400-\u04FF'`-]{2,})(?:ning)\s+(?:sahifa|kabinet|profil)/i,
    },
  ];

  for (const { role, re } of patterns) {
    const m = text.match(re);
    const nameQuery = m?.[1]?.trim().toLowerCase();
    if (!nameQuery || nameQuery.length < 2) continue;
    if (/^(sahifa|kabinet|profil|ochib|ber|mening)$/i.test(nameQuery)) continue;
    return { role: roleFromLabel ?? role, nameQuery };
  }

  return null;
}

export function hasPersonPageIntent(text: string): boolean {
  return parsePersonPageIntent(text) !== null;
}
