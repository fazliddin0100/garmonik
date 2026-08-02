/** Ma'muriy va xizmat ko‘rsatish — no-tibbiy rollar */

export type AdminSupportRoleDef = {
  /** Kartochka sarlavhasi */
  title: string;
  /** Admin yaratishda `roleName` sifatida yoziladi */
  roleLabel: string;
  /** Qo‘shimcha moslash uchun kalit so‘zlar */
  keywords: string[];
};

export const BUILTIN_ADMIN_SUPPORT_ROLES: AdminSupportRoleDef[] = [
  {
    title: "Kadrlar bo'limi (HR)",
    roleLabel: 'Kadrlar bo‘limi',
    keywords: ['kadrlar', 'hr', 'xodimlar'],
  },
  {
    title: 'Buxgalter (kassa admin)',
    roleLabel: 'Buxgalter',
    keywords: ['moliya', 'buxgalter', 'hisob', 'finance', 'kassa-admin'],
  },
  {
    title: 'Yurist va shartnoma mutaxassisi',
    roleLabel: 'Yurist',
    keywords: ['yurist', 'shartnoma', 'huquq'],
  },
  {
    title: 'IT administrator / texnik yordam',
    roleLabel: 'IT / texnik yordam',
    keywords: ['it', 'texnik', 'dastur'],
  },
  {
    title: "Xo'jalik bo'limi (tozalik, kir yuvish, sterilizatsiya)",
    roleLabel: "Xo‘jalik bo‘limi",
    keywords: ["xo'jalik", 'xo‘jalik', 'tozalik', 'steril'],
  },
  {
    title: 'Xavfsizlik xizmati',
    roleLabel: 'Xavfsizlik xizmati',
    keywords: ['xavfsizlik', "qo'riqlash", 'qo‘riqlash'],
  },
  {
    title: "Ta'minot va xarid bo'limi",
    roleLabel: "Ta'minot va xarid",
    keywords: ["ta'minot", 'xarid', 'ombor'],
  },
  {
    title: 'Kassir',
    roleLabel: 'Kassir',
    keywords: ['kassir', 'kassa', 'to‘lov', "to'lov"],
  },
];

export function isSuperAdminRoleName(value: string): boolean {
  return /super\s*admin(istrator)?/i.test(value.trim());
}

export function normalizeRoleKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u0027\u0060\u00B4\u2018\u2019\u201B\u2032\u02B9\u02BB\u02BC]/g, "'")
    .replace(/\s+/g, ' ');
}

export function rolesMatch(a: string, b: string): boolean {
  return normalizeRoleKey(a) === normalizeRoleKey(b);
}
