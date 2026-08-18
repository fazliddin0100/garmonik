export const PHARMACY_CATEGORY_DEFS = [
  { id: 'antibiotics', label: 'Antibiotiklar' },
  { id: 'infusions', label: 'Infuziya eritmalari' },
  { id: 'anesthetics', label: 'Anesteziklar' },
  { id: 'amino_acids', label: 'Aminokislotalar' },
  { id: 'diabetes', label: 'Diabet vositalari' },
  { id: 'consumables', label: 'Sarf materiallari' },
  { id: 'blood_pressure', label: 'Bosim dorilari' },
  { id: 'pain', label: "Og'riq qoldiruvchilar" },
  { id: 'emergency', label: 'Shoshilinch yordam dorilari' },
  { id: 'thyroid', label: 'Qalqonsimon bez dorilari' },
] as const;

export type PharmacyCategoryId = (typeof PHARMACY_CATEGORY_DEFS)[number]['id'];

export type PharmacyProduct = {
  id: string;
  barcode: string;
  rowNum: number;
  name: string;
  unit: string;
  group: string;
  type: string;
  packageCount: number;
  status: string;
  category: PharmacyCategoryId;
};

export const PHARMACY_STORAGE_KEY = 'garmonik-pharmacy-products-v1';

export function isPharmacyCategoryId(value: string): value is PharmacyCategoryId {
  return PHARMACY_CATEGORY_DEFS.some((c) => c.id === value);
}

/** Eski yoki noma’lum kategoriya → sarf materiallari */
export function normalizePharmacyCategory(
  value: string | undefined | null,
): PharmacyCategoryId {
  if (value && isPharmacyCategoryId(value)) return value;
  return 'consumables';
}

export function mergePharmacyCatalog(
  existing: PharmacyProduct[],
  catalog: PharmacyProduct[],
): { products: PharmacyProduct[]; added: number } {
  const byId = new Map(existing.map((p) => [p.id, p]));
  let added = 0;
  const next = existing.map((p) => ({
    ...p,
    category: normalizePharmacyCategory(p.category),
  }));

  for (const item of catalog) {
    if (byId.has(item.id)) continue;
    const maxRow = next.reduce((m, p) => Math.max(m, p.rowNum), 0);
    next.push({
      ...item,
      rowNum: next.length === 0 ? item.rowNum : maxRow + 1,
      category: normalizePharmacyCategory(item.category),
    });
    byId.set(item.id, item);
    added += 1;
  }

  return { products: next, added };
}
