/** Xodimlar: qisqa login → Supabase Auth uchun barqaror “email” */
export function staffAuthEmail(shortLogin: string): string {
  const s = shortLogin
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
  return `${s || 'user'}@staff.garmonik.local`;
}
