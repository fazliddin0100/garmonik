/** Yoshtan taxminiy tug'ilgan sana (ISO YYYY-MM-DD) */
export function birthIsoFromAge(age: number, referenceDate = new Date()): string {
  const d = new Date(referenceDate);
  d.setFullYear(d.getFullYear() - Math.floor(age));
  return d.toISOString().slice(0, 10);
}

/** ISO yoki DD.MM.YYYY → ISO YYYY-MM-DD */
export function parseBirthInputToIso(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return '';
  const t = raw.trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);

  const dmY = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (dmY) {
    const [, dd, mm, yyyy] = dmY;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  return t;
}

export function resolvePatientBirthIso(
  birthDate?: string | null,
  age?: number | null,
): string {
  const iso = parseBirthInputToIso(birthDate ?? '');
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  if (typeof age === 'number' && Number.isFinite(age) && age > 0) {
    return birthIsoFromAge(age);
  }
  return '';
}

/** UI uchun: DD.MM.YYYY; faqat yosh bo'lsa ~ belgisi bilan taxminiy sana */
export function formatBirthDateForDisplay(
  birthDate?: string | null,
  age?: number | null,
): string {
  const directIso = parseBirthInputToIso(birthDate ?? '');
  const hasExact =
    Boolean(directIso) && /^\d{4}-\d{2}-\d{2}$/.test(directIso);

  const iso =
    hasExact ? directIso : (
      typeof age === 'number' && Number.isFinite(age) && age > 0 ?
        birthIsoFromAge(age)
      : '');

  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';

  const [y, m, d] = iso.split('-');
  const formatted = `${d}.${m}.${y}`;
  return hasExact ? formatted : `~${formatted}`;
}

/** Jadval uchun yosh (to'g'ridan-to'g'ri yosh yoki tug'ilgan sanadan) */
export function formatPatientAgeDisplay(
  age?: number | null,
  birthDate?: string | null,
): string {
  if (typeof age === 'number' && Number.isFinite(age) && age > 0) {
    return String(Math.floor(age));
  }
  const iso = resolvePatientBirthIso(birthDate ?? '', age);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
  const [y, m, d] = iso.split('-').map((part) => Number.parseInt(part, 10));
  const today = new Date();
  let years = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  const dayDiff = today.getDate() - d;
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years -= 1;
  return years > 0 ? String(years) : '—';
}
