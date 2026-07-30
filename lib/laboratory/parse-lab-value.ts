/** Me'yor matnini jins bo'yicha tanlash */
export function isFemaleGender(gender?: string): boolean {
  const g = (gender ?? '').trim().toLowerCase();
  return (
    g.includes('ayol') ||
    g.includes('ж') ||
    g === 'f' ||
    g === 'female' ||
    g === 'жен'
  );
}

export function resolveNormText(norm: string | undefined, gender?: string): string {
  if (!norm?.trim()) return '';
  let text = norm.trim();
  if (text.includes(';')) {
    const parts = text.split(';').map((p) => p.trim());
    const idx = isFemaleGender(gender) && parts.length > 1 ? 1 : 0;
    text = parts[idx];
  }
  return text.replace(/\([^)]*\)/g, '').trim();
}

export type NormComparison =
  | { kind: 'range'; min: number; max: number }
  | { kind: 'max'; max: number }
  | { kind: 'min'; min: number }
  | { kind: 'qualitative'; expected: 'negative' }
  | { kind: 'unknown' };

export type CompareStatus = 'normal' | 'high' | 'low' | 'abnormal' | 'unknown';

export function parseNumericLabValue(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number.parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function parseNormComparison(normText: string): NormComparison {
  const t = normText.trim().toLowerCase();
  if (
    !t ||
    t === '—' ||
    t === '-' ||
    t.includes('faza') ||
    t.includes('aniqlanmagan')
  ) {
    return { kind: 'unknown' };
  }
  if (t === 'manfiy') return { kind: 'qualitative', expected: 'negative' };

  const maxMatch = t.match(/^<\s*([\d.,]+)/);
  if (maxMatch) {
    return { kind: 'max', max: Number.parseFloat(maxMatch[1].replace(',', '.')) };
  }

  const minMatch = t.match(/^>\s*([\d.,]+)/);
  if (minMatch) {
    return { kind: 'min', min: Number.parseFloat(minMatch[1].replace(',', '.')) };
  }

  const rangeMatch = t.match(/^([\d.,]+)\s*[–—\-]\s*([\d.,]+)/);
  if (rangeMatch) {
    return {
      kind: 'range',
      min: Number.parseFloat(rangeMatch[1].replace(',', '.')),
      max: Number.parseFloat(rangeMatch[2].replace(',', '.')),
    };
  }

  return { kind: 'unknown' };
}

export function compareNumericToNorm(value: number, norm: NormComparison): CompareStatus {
  switch (norm.kind) {
    case 'range':
      if (value < norm.min) return 'low';
      if (value > norm.max) return 'high';
      return 'normal';
    case 'max':
      return value > norm.max ? 'high' : 'normal';
    case 'min':
      return value < norm.min ? 'low' : 'normal';
    default:
      return 'unknown';
  }
}

const NEGATIVE_MARKERS = ['manfiy', 'negative', 'neg', "yo'q", 'yoq', '0', '-', 'aniqlanmadi'];
const POSITIVE_MARKERS = [
  'musbat',
  'positive',
  'pos',
  'bor',
  '+',
  'aniqlangan',
  'reaksiya',
];

export function compareQualitativeToNorm(value: string): CompareStatus {
  const v = value.trim().toLowerCase();
  if (!v) return 'unknown';
  if (NEGATIVE_MARKERS.some((m) => v.includes(m))) return 'normal';
  if (POSITIVE_MARKERS.some((m) => v.includes(m))) return 'abnormal';
  return 'unknown';
}

export function formatDeviation(
  value: number,
  status: CompareStatus,
  norm: NormComparison,
): string | undefined {
  if (status === 'normal' || status === 'unknown') return undefined;
  if (norm.kind === 'range') {
    const mid = (norm.min + norm.max) / 2;
    if (mid === 0) return undefined;
    const pct = Math.round((Math.abs(value - mid) / mid) * 100);
    if (status === 'high') return `Me'yordan ~${pct}% yuqori`;
    if (status === 'low') return `Me'yordan ~${pct}% past`;
  }
  if (norm.kind === 'max' && status === 'high') {
    const pct = Math.round(((value - norm.max) / norm.max) * 100);
    return `Me'yordan ~${pct}% yuqori`;
  }
  if (norm.kind === 'min' && status === 'low') {
    const pct = Math.round(((norm.min - value) / norm.min) * 100);
    return `Me'yordan ~${pct}% past`;
  }
  return undefined;
}
