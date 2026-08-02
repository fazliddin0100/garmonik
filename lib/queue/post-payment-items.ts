import { findCatalogItem, type LabCategory } from '@/lib/laboratory/catalog-types';
import {
  priceRowByServiceKey,
  type ServicePriceRow,
} from '@/lib/services/pricing-data';

export type PostPaymentLineItem = {
  key: string;
  name: string;
  price: number;
  groupLabel?: string;
};

export function resolvePostPaymentLineItems(
  orderedKeys: string[],
  priceRows: ServicePriceRow[] = [],
  labCatalog: LabCategory[] = [],
): PostPaymentLineItem[] {
  const items: PostPaymentLineItem[] = [];

  for (const key of orderedKeys) {
    if (key.startsWith('cat:')) {
      const hit = findCatalogItem(labCatalog, key);
      if (hit) {
        items.push({
          key,
          name: hit.item.name,
          price: 0,
          groupLabel: hit.category.title,
        });
      }
      continue;
    }

    const row = priceRowByServiceKey(key, priceRows);
    if (row) {
      items.push({
        key,
        name: row.name,
        price: row.price,
        groupLabel: row.groupLabel,
      });
    }
  }

  return items;
}

export function sumPostPaymentTotal(items: PostPaymentLineItem[]): number {
  return items.reduce((acc, item) => acc + item.price, 0);
}

export function formatPostPaymentLabel(items: PostPaymentLineItem[]): string {
  const priced = items.filter((i) => i.price > 0);
  const total = sumPostPaymentTotal(priced);
  if (priced.length === 0) {
    return items.length > 0 ?
        `Shifokor buyurtmasi — ${items.length} tahlil parametri`
      : 'Shifokor buyurtmasi';
  }
  const names =
    priced.length <= 2 ?
      priced.map((i) => i.name).join(', ')
    : `${priced.length} xizmat`;
  return `Shifokor buyurtmasi — ${names} — ${total.toLocaleString('uz-UZ')} so'm`;
}
