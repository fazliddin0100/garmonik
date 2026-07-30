import type { LabCategory } from '@/lib/laboratory/catalog-types';
import type { ServiceTypeRow } from '@/lib/service-types/types';

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tokens(s: string): string[] {
  return norm(s)
    .split(/[^a-zа-яёʻʼ‘’o'0-9]+/i)
    .filter((t) => t.length > 2);
}

function scoreMatch(st: ServiceTypeRow, c: LabCategory): number {
  const sid = norm(st.serviceId);
  const cid = norm(c.id);
  if (sid && cid && (sid === cid || sid.includes(cid) || cid.includes(sid))) return 100;

  const a = norm(st.name);
  const b = norm(c.title);
  if (a && b) {
    if (a === b) return 95;
    if (b.includes(a) || a.includes(b)) return 85;
    const ta = tokens(st.name);
    const tb = tokens(c.title);
    let hits = 0;
    for (const t of ta) {
      if (tb.some((u) => u.includes(t) || t.includes(u))) hits += 1;
    }
    if (hits >= 2) return 70;
    if (hits === 1) return 40;
  }

  const code = norm(st.code);
  if (code && cid && (code === cid || cid.includes(code))) return 35;

  return 0;
}

/** Xizmat nomi / ID bo‘yicha laboratoriya katalogidagi mos turkumlarni topadi (0–3 ta). */
export function findMatchingLabCategories(
  st: ServiceTypeRow,
  catalog: LabCategory[],
): LabCategory[] {
  if (!catalog.length) return [];
  const scored = catalog
    .map((c) => ({ c, s: scoreMatch(st, c) }))
    .filter((x) => x.s >= 35)
    .sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title, 'uz'));
  const out: LabCategory[] = [];
  const seen = new Set<string>();
  for (const { c } of scored) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
    if (out.length >= 3) break;
  }
  return out;
}
