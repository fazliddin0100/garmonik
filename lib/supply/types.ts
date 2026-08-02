export type SupplyOrderStatus =
  | 'yangi'
  | 'qabul_qilindi'
  | 'sotib_olindi'
  /** Buyurtmachi omborga qabul qildi */
  | 'omborda'
  | 'bekor';

export type SupplyOrderSource = 'kitchen' | 'pharmacy' | 'clinic';

export type SupplyOrder = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  note: string;
  requestedBy: string;
  /** Oshxona / dorixona buyurtmasi — Ta'minot xodimiga keladi */
  source?: SupplyOrderSource;
  status: SupplyOrderStatus;
  createdAt: string;
  updatedAt: string;
  /** Omborga qabul qilingan vaqt */
  receivedAt?: string;
};

export function isKitchenSupplyOrder(
  order: Pick<SupplyOrder, 'source' | 'requestedBy'>,
): boolean {
  if (order.source === 'kitchen') return true;
  return (
    typeof order.requestedBy === 'string' &&
    /oshxona|oshpaz/i.test(order.requestedBy)
  );
}

export function isPharmacySupplyOrder(
  order: Pick<SupplyOrder, 'source' | 'requestedBy'>,
): boolean {
  if (order.source === 'pharmacy') return true;
  return (
    typeof order.requestedBy === 'string' &&
    /dorixona|farmatsevt|apteka/i.test(order.requestedBy)
  );
}

/** Bo‘limdan kelgan (oshxona yoki dorixona) yangi so‘rovlar */
export function isDepartmentSupplyOrder(
  order: Pick<SupplyOrder, 'source' | 'requestedBy'>,
): boolean {
  return isKitchenSupplyOrder(order) || isPharmacySupplyOrder(order);
}

/** Sotib olingan, buyurtmachi omborga qabul qilishi kerak */
export function isAwaitingDepartmentReceipt(
  order: Pick<SupplyOrder, 'status'>,
): boolean {
  return order.status === 'sotib_olindi';
}

export type SupplyPurchase = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  supplier: string;
  purchasedAt: string;
  note: string;
  orderId: string;
  createdAt: string;
};

export const SUPPLY_ORDER_STATUS_LABELS: Record<SupplyOrderStatus, string> = {
  yangi: 'Yangi',
  qabul_qilindi: 'Qabul qilindi',
  sotib_olindi: 'Sotib olindi',
  omborda: 'Omborga qo‘shildi',
  bekor: 'Bekor',
};
