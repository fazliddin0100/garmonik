export type PatientPrescriptionItem = {
  productId: string;
  productName: string;
  unit: string;
  /** Qabul qilish tartibi, masalan: 1 tab. kuniga 2 marta */
  dosage?: string;
  /** Davomiylik, masalan: 7 kun */
  duration?: string;
  /** Miqdor (ixtiyoriy) */
  quantity?: number;
  note?: string;
};

export type PatientPrescription = {
  id: string;
  prescribedAt: string;
  prescribedByName?: string;
  prescribedByLogin?: string;
  items: PatientPrescriptionItem[];
  note?: string;
};

export function normalizePatientPrescriptions(raw: unknown): PatientPrescription[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: PatientPrescription[] = [];
  for (const item of raw) {
    const p = normalizePatientPrescription(item);
    if (p) out.push(p);
  }
  return out.length > 0 ? out : undefined;
}

export function normalizePatientPrescription(raw: unknown): PatientPrescription | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const prescribedAt = typeof r.prescribedAt === 'string' ? r.prescribedAt.trim() : '';
  if (!id || !prescribedAt) return null;

  const itemsRaw = Array.isArray(r.items) ? r.items : [];
  const items: PatientPrescriptionItem[] = [];
  for (const row of itemsRaw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const productId = typeof o.productId === 'string' ? o.productId.trim() : '';
    const productName = typeof o.productName === 'string' ? o.productName.trim() : '';
    if (!productId || !productName) continue;
    items.push({
      productId,
      productName,
      unit: typeof o.unit === 'string' ? o.unit : '',
      dosage: typeof o.dosage === 'string' ? o.dosage.trim() || undefined : undefined,
      duration: typeof o.duration === 'string' ? o.duration.trim() || undefined : undefined,
      quantity:
        typeof o.quantity === 'number' && o.quantity > 0 ? Math.floor(o.quantity) : undefined,
      note: typeof o.note === 'string' ? o.note.trim() || undefined : undefined,
    });
  }
  if (items.length === 0) return null;

  return {
    id,
    prescribedAt,
    prescribedByName:
      typeof r.prescribedByName === 'string' ? r.prescribedByName.trim() || undefined : undefined,
    prescribedByLogin:
      typeof r.prescribedByLogin === 'string' ? r.prescribedByLogin.trim() || undefined : undefined,
    items,
    note: typeof r.note === 'string' ? r.note.trim() || undefined : undefined,
  };
}

export function formatPrescriptionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
