import type { SupplyOrder } from '@/lib/supply/types';

export async function receiveSupplyOrderToStock(
  orderId: string,
): Promise<{ ok: true; order: SupplyOrder } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/supply/orders/${encodeURIComponent(orderId)}/receive`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      order?: SupplyOrder;
    };
    if (!res.ok || !data.order) {
      return { ok: false, error: data.error || 'Qabul qilib bo‘lmadi' };
    }
    return { ok: true, order: data.order };
  } catch {
    return { ok: false, error: 'Qabul qilib bo‘lmadi' };
  }
}
