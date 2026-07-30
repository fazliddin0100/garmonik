/** Shifokor «Tibbiy xizmat natijalari»dan tanlagan lab / mutaxassis natijalari */

export type SelectedServiceResultRef =
  | { kind: 'lab'; orderKey: string }
  | { kind: 'specialist'; consultationId: string };

export function selectedServiceResultKey(ref: SelectedServiceResultRef): string {
  return ref.kind === 'lab' ? `lab:${ref.orderKey}` : `specialist:${ref.consultationId}`;
}

export function normalizeSelectedServiceResults(
  raw: unknown,
): SelectedServiceResultRef[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const out: SelectedServiceResultRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const kind = typeof o.kind === 'string' ? o.kind.trim() : '';
    if (kind === 'lab') {
      const orderKey = typeof o.orderKey === 'string' ? o.orderKey.trim() : '';
      if (!orderKey) continue;
      const key = `lab:${orderKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: 'lab', orderKey });
      continue;
    }
    if (kind === 'specialist') {
      const consultationId =
        typeof o.consultationId === 'string' ? o.consultationId.trim() : '';
      if (!consultationId) continue;
      const key = `specialist:${consultationId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: 'specialist', consultationId });
    }
  }
  return out.length > 0 ? out : undefined;
}

export function isServiceResultSelected(
  selected: SelectedServiceResultRef[] | undefined,
  ref: SelectedServiceResultRef,
): boolean {
  const key = selectedServiceResultKey(ref);
  return (selected ?? []).some((item) => selectedServiceResultKey(item) === key);
}

export function toggleSelectedServiceResult(
  selected: SelectedServiceResultRef[] | undefined,
  ref: SelectedServiceResultRef,
): SelectedServiceResultRef[] | undefined {
  const prev = selected ?? [];
  const key = selectedServiceResultKey(ref);
  const exists = prev.some((item) => selectedServiceResultKey(item) === key);
  const next =
    exists ?
      prev.filter((item) => selectedServiceResultKey(item) !== key)
    : [...prev, ref];
  return next.length > 0 ? next : undefined;
}

/** Berilgan ref’larni tanlashga qo‘shish (mavjudlarni saqlab) */
export function addSelectedServiceResults(
  selected: SelectedServiceResultRef[] | undefined,
  refs: SelectedServiceResultRef[],
): SelectedServiceResultRef[] | undefined {
  const map = new Map<string, SelectedServiceResultRef>();
  for (const item of selected ?? []) {
    map.set(selectedServiceResultKey(item), item);
  }
  for (const ref of refs) {
    map.set(selectedServiceResultKey(ref), ref);
  }
  const next = [...map.values()];
  return next.length > 0 ? next : undefined;
}

/** Berilgan ref’larni tanlovdan olib tashlash */
export function removeSelectedServiceResults(
  selected: SelectedServiceResultRef[] | undefined,
  refs: SelectedServiceResultRef[],
): SelectedServiceResultRef[] | undefined {
  const removeKeys = new Set(refs.map(selectedServiceResultKey));
  const next = (selected ?? []).filter(
    (item) => !removeKeys.has(selectedServiceResultKey(item)),
  );
  return next.length > 0 ? next : undefined;
}

export function areAllServiceResultsSelected(
  selected: SelectedServiceResultRef[] | undefined,
  refs: SelectedServiceResultRef[],
): boolean {
  if (refs.length === 0) return false;
  return refs.every((ref) => isServiceResultSelected(selected, ref));
}
