import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import type { VerifiedSession } from '@/lib/auth/session-jwt';
import {
  normalizeKitchenProduct,
  type KitchenProduct,
} from '@/lib/kitchen/types';
import type { PharmacyProduct } from '@/lib/pharmacy/types';
import {
  readClinicResource,
  writeClinicResource,
} from '@/lib/server/clinic-resource-service';
import { blockedIpResponse, isRequestIpBlocked } from '@/lib/server/ip-block';
import { logSecurityEvent } from '@/lib/server/security-log';
import {
  isKitchenSupplyOrder,
  isPharmacySupplyOrder,
  type SupplyOrder,
} from '@/lib/supply/types';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ id: string }> };

function canReceiveKitchen(session: VerifiedSession): boolean {
  if (session.kind === 'staff' && session.role === 'oshpaz') return true;
  if (session.kind === 'admin' && session.routeGroup === 'kitchen') return true;
  return false;
}

function canReceivePharmacy(session: VerifiedSession): boolean {
  if (session.kind === 'staff' && session.role === 'farmatsevt') return true;
  if (session.kind === 'admin' && session.routeGroup === 'pharmacy') return true;
  return false;
}

function foldName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function addToKitchenStock(
  products: KitchenProduct[],
  order: SupplyOrder,
): KitchenProduct[] {
  const key = foldName(order.productName);
  const now = new Date().toISOString();
  const idx = products.findIndex((p) => foldName(p.name) === key);
  if (idx >= 0) {
    const cur = products[idx]!;
    const next = [...products];
    next[idx] = {
      ...cur,
      remainingQty: Number(cur.remainingQty) + Number(order.quantity),
      unit: order.unit.trim() || cur.unit,
      updatedAt: now,
    };
    return next;
  }
  const created: KitchenProduct = {
    id: crypto.randomUUID(),
    name: order.productName.trim(),
    unit: order.unit.trim() || 'kg',
    remainingQty: Number(order.quantity),
    minQty: 0,
    note: 'Ta’minotdan qabul qilindi',
    updatedAt: now,
  };
  return [...products, created].sort((a, b) =>
    a.name.localeCompare(b.name, 'uz'),
  );
}

function addToPharmacyStock(
  products: PharmacyProduct[],
  order: SupplyOrder,
): PharmacyProduct[] {
  const key = foldName(order.productName);
  const idx = products.findIndex((p) => foldName(p.name) === key);
  const qty = Math.max(0, Math.round(Number(order.quantity)));
  if (idx >= 0) {
    const cur = products[idx]!;
    const next = [...products];
    next[idx] = {
      ...cur,
      packageCount: Number(cur.packageCount) + qty,
      unit: order.unit.trim() || cur.unit,
    };
    return next;
  }
  const maxRow = products.reduce((m, p) => Math.max(m, Number(p.rowNum) || 0), 0);
  const created: PharmacyProduct = {
    id: `pharm-${Date.now()}`,
    barcode: '',
    rowNum: maxRow + 1,
    name: order.productName.trim(),
    unit: order.unit.trim() || 'dona',
    group: '',
    type: '',
    packageCount: qty,
    status: 'Актив',
    category: 'consumables',
  };
  return [...products, created];
}

/**
 * Ta'minot "Sotib olindi" qilgach — buyurtmachi omborga qabul qiladi.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  if (await isRequestIpBlocked(request)) {
    return blockedIpResponse();
  }

  const session = await getVerifiedSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
  }

  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: 'Buyurtma topilmadi' }, { status: 404 });
  }

  try {
    const raw = await readClinicResource('supply-orders');
    const orders = Array.isArray(raw) ? (raw as SupplyOrder[]) : [];
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return NextResponse.json({ error: 'Buyurtma topilmadi' }, { status: 404 });
    }
    if (order.status !== 'sotib_olindi') {
      return NextResponse.json(
        {
          error:
            order.status === 'omborda' ?
              'Bu buyurtma allaqachon omborga qo‘shilgan'
            : 'Avval Ta’minot sotib olishi kerak',
        },
        { status: 400 },
      );
    }

    const kitchen = isKitchenSupplyOrder(order);
    const pharmacy = isPharmacySupplyOrder(order);
    if (!kitchen && !pharmacy) {
      return NextResponse.json(
        { error: 'Bu buyurtma bo‘lim omboriga bog‘lanmagan' },
        { status: 400 },
      );
    }
    if (kitchen && !canReceiveKitchen(session)) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
    }
    if (pharmacy && !canReceivePharmacy(session)) {
      return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 401 });
    }

    if (kitchen) {
      const stockRaw = await readClinicResource('kitchen-products');
      const stock = (Array.isArray(stockRaw) ? stockRaw : [])
        .map(normalizeKitchenProduct)
        .filter((p): p is KitchenProduct => p !== null);
      await writeClinicResource(
        'kitchen-products',
        addToKitchenStock(stock, order),
      );
    } else {
      const stockRaw = await readClinicResource('pharmacy-products');
      const stock = Array.isArray(stockRaw) ? (stockRaw as PharmacyProduct[]) : [];
      await writeClinicResource(
        'pharmacy-products',
        addToPharmacyStock(stock, order),
      );
    }

    const now = new Date().toISOString();
    const updated: SupplyOrder = {
      ...order,
      status: 'omborda',
      receivedAt: now,
      updatedAt: now,
    };
    const nextOrders = orders.map((o) => (o.id === orderId ? updated : o));
    await writeClinicResource('supply-orders', nextOrders);

    await logSecurityEvent({
      request,
      session,
      eventType: 'clinic_data_write',
      target: `/api/supply/orders/${orderId}/receive`,
      meta: {
        key: kitchen ? 'kitchen-products' : 'pharmacy-products',
        orderId,
      },
    });

    return NextResponse.json({ ok: true, order: updated });
  } catch (e) {
    console.error('supply/orders receive:', e);
    return NextResponse.json(
      { error: 'Qabul qilib bo‘lmadi' },
      { status: 500 },
    );
  }
}
