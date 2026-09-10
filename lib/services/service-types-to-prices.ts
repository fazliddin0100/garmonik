import {
  SERVICE_GROUPS,
  servicePriceKey,
  type ServiceGroupKey,
  type ServicePriceRow,
} from '@/lib/services/pricing-data';
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
  const groupKey = serviceGroupLabelToKey(row.group) ?? 'boshqa';
  const groupMeta = SERVICE_GROUPS.find((g) => g.key === groupKey);
  const id = (row.serviceId || row.id).trim();
  const code = (row.code || row.serviceId || row.id).trim();
  if (!id || !code || !row.name.trim()) return null;
  return {
    id,
    code,
    group: groupKey,
    groupLabel: row.group.trim() || groupMeta?.label || 'Boshqa',
    name: row.name.trim(),
    price: Number.isFinite(row.price) ? row.price : 0,
  };
}

/** Navbat / kassa uchun barqaror kalit (`id-kod`, mapping bo‘lmasa `st:{id}`). */
export function serviceTypeOrderKey(row: ServiceTypeRow): string {
  const mapped = serviceTypeToPriceRow(row);
  if (mapped) return servicePriceKey(mapped);
  return `st:${row.id}`;
}

export function serviceTypeByOrderKey(
  key: string,
  rows: ServiceTypeRow[],
): ServiceTypeRow | undefined {
  return rows.find((r) => serviceTypeOrderKey(r) === key);
}

/** Narx katalogi → xizmat turlari (shifokor modalida zaxira ro‘yxat). */
export function priceRowsToServiceTypeRows(
  rows: ServicePriceRow[],
): ServiceTypeRow[] {
  return rows.map((row, index) => ({
    id: row.id || `price-${index}`,
    serviceId: row.id,
    code: row.code,
    group: row.groupLabel?.trim() || row.group,
    name: row.name,
    price: Number.isFinite(row.price) ? row.price : 0,
    rowNum: index + 1,
  }));
}

/** Xizmat turlari → service-prices (barcha guruhlar, shu jumladan maxsus nomlar) */
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
