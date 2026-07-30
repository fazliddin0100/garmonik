import type { LabCategory } from './catalog-types';

export function filterLabCatalog(catalog: LabCategory[], query: string): LabCategory[] {
  const s = query.trim().toLowerCase();
  if (!s) return catalog;
  return catalog
    .map((c) => {
      if (c.title.toLowerCase().includes(s)) return { ...c, items: [...c.items] };
      const items = c.items.filter(
        (it) =>
          it.name.toLowerCase().includes(s) ||
          (it.norm && it.norm.toLowerCase().includes(s)) ||
          (it.unit && it.unit.toLowerCase().includes(s)) ||
          (it.code && it.code.toLowerCase().includes(s)),
      );
      if (items.length === 0) return null;
      return { ...c, items };
    })
    .filter((x): x is LabCategory => x !== null);
}
