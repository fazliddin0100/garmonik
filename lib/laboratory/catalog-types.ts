export type LabTestItem = {
  id: string;
  name: string;
  code?: string;
  norm?: string;
  unit?: string;
};

export type LabCategory = {
  id: string;
  title: string;
  items: LabTestItem[];
};

export const LAB_CATALOG_STORAGE_KEY = 'garmonik-lab-catalog-v1';

export function catalogRef(categoryId: string, itemId: string): string {
  return `cat:${categoryId}:${itemId}`;
}

export function parseCatalogRef(ref: string): { categoryId: string; itemId: string } | null {
  if (!ref.startsWith('cat:')) return null;
  const rest = ref.slice(4);
  const i = rest.indexOf(':');
  if (i <= 0) return null;
  return { categoryId: rest.slice(0, i), itemId: rest.slice(i + 1) };
}

export function findCatalogItem(
  catalog: LabCategory[],
  ref: string,
): { category: LabCategory; item: LabTestItem } | null {
  const p = parseCatalogRef(ref);
  if (!p) return null;
  const category = catalog.find((c) => c.id === p.categoryId);
  if (!category) return null;
  const item = category.items.find((it) => it.id === p.itemId);
  if (!item) return null;
  return { category, item };
}
