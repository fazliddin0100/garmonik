/** Hamshira kiritgan tahlil / xizmat natijasi (buyurtma kaliti bo‘yicha) */
export type LaboratoryResultEntry = {
  orderKey: string;
  value: string;
  enteredAt?: string;
  enteredByName?: string;
  enteredByLogin?: string;
};

export function normalizeLaboratoryResults(raw: unknown): LaboratoryResultEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: LaboratoryResultEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const orderKey = typeof o.orderKey === 'string' ? o.orderKey.trim() : '';
    const value = typeof o.value === 'string' ? o.value.trim() : '';
    if (!orderKey) continue;
    out.push({
      orderKey,
      value,
      enteredAt: typeof o.enteredAt === 'string' ? o.enteredAt : undefined,
      enteredByName:
        typeof o.enteredByName === 'string' ? o.enteredByName.trim() || undefined : undefined,
      enteredByLogin:
        typeof o.enteredByLogin === 'string' ? o.enteredByLogin.trim() || undefined : undefined,
    });
  }
  return out.length > 0 ? out : undefined;
}

export function resultByOrderKey(
  results: LaboratoryResultEntry[] | undefined,
  orderKey: string,
): LaboratoryResultEntry | undefined {
  return results?.find((r) => r.orderKey === orderKey);
}

export function hasDoctorLabAssignment(p: {
  orderedLaboratoryKeys?: string[];
  queueClinicalNote?: string;
}): boolean {
  return (p.orderedLaboratoryKeys?.length ?? 0) > 0;
}

/** Buyurtma qilingan barcha tahlillar uchun natija kiritilgan */
export function hasAllLabResultsEntered(p: {
  orderedLaboratoryKeys?: string[];
  laboratoryResults?: LaboratoryResultEntry[];
}): boolean {
  const keys = p.orderedLaboratoryKeys ?? [];
  if (keys.length === 0) return false;
  return keys.every((key) => {
    const value = resultByOrderKey(p.laboratoryResults, key)?.value?.trim();
    return !!value;
  });
}

export function countEnteredLabResults(p: {
  laboratoryResults?: LaboratoryResultEntry[];
}): number {
  return p.laboratoryResults?.filter((r) => r.value.trim().length > 0).length ?? 0;
}
