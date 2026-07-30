import { findCatalogItem } from '@/lib/laboratory/catalog-types';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import {
  priceRowByServiceKey,
  type ServicePriceRow,
} from '@/lib/services/pricing-data';

export type ResolvedLabOrder = {
  key: string;
  label: string;
  kind: 'catalog' | 'service';
  categoryTitle?: string;
  norm?: string;
  unit?: string;
};

export function resolveLabOrders(
  keys: string[],
  catalog: LabCategory[],
  prices: ServicePriceRow[],
): ResolvedLabOrder[] {
  const out: ResolvedLabOrder[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const found = findCatalogItem(catalog, key);
    if (found) {
      out.push({
        key,
        kind: 'catalog',
        label: found.item.name,
        categoryTitle: found.category.title,
        norm: found.item.norm,
        unit: found.item.unit,
      });
      continue;
    }
    const row = priceRowByServiceKey(key, prices);
    if (row) {
      out.push({
        key,
        kind: 'service',
        label: row.name,
        categoryTitle: row.groupLabel,
      });
      continue;
    }
    out.push({ key, kind: 'service', label: key });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, 'uz'));
}
