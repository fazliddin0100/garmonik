import { SERVICE_GROUPS, type ServiceGroupKey, type ServicePriceRow } from '@/lib/services/pricing-data';
import type { ServiceTypeRow } from '@/lib/service-types/types';

/** Guruh yorlig‘i → narxlar katalogi kaliti */
export function serviceGroupLabelToKey(
  label: string,
): ServiceGroupKey | null {
  const t = label.trim().toLowerCase();
  if (!t) return null;
  const hit = SERVICE_GROUPS.find((g) => g.label.trim().toLowerCase() === t);
  if (hit) return hit.key;
  // Qisqa / alternativ nomlar
  if (t.includes('laborator')) return 'laboratoriya';
  if (t.includes('fizioter')) return 'fizioterapiya';
  if (t.includes('kardiolog')) return 'kardiologiya';
  if (t.includes('pullik')) return 'pullik-xizmat';
  if (t.includes('shifokor') || t.includes("ko'rig") || t.includes('korig')) {
    return 'shifokor-korigi';
  }
  if (t === 'uzi' || t.includes('ultratovush')) return 'uzi';
  return null;
}

export function serviceTypeToPriceRow(row: ServiceTypeRow): ServicePriceRow | null {
  const groupKey = serviceGroupLabelToKey(row.group);
  if (!groupKey) return null;
  const groupMeta = SERVICE_GROUPS.find((g) => g.key === groupKey);
  const id = (row.serviceId || row.id).trim();
  const code = (row.code || row.serviceId || row.id).trim();
  if (!id || !code || !row.name.trim()) return null;
  return {
    id,
    code,
    group: groupKey,
    groupLabel: groupMeta?.label || row.group.trim(),
    name: row.name.trim(),
    price: Number.isFinite(row.price) ? row.price : 0,
  };
}

/** Xizmat turlari → service-prices (faqat standart guruhlar) */
export function serviceTypesToPriceRows(rows: ServiceTypeRow[]): ServicePriceRow[] {
  const out: ServicePriceRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const mapped = serviceTypeToPriceRow(row);
    if (!mapped) continue;
    const key = `${mapped.id}-${mapped.code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mapped);
  }
  return out;
}
