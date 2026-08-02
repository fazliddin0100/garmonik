'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import {
  isDepartmentSupplyOrder,
  isKitchenSupplyOrder,
  isPharmacySupplyOrder,
  SUPPLY_ORDER_STATUS_LABELS,
  type SupplyOrder,
  type SupplyOrderStatus,
  type SupplyPurchase,
} from '@/lib/supply/types';
import {
  CheckCircle2,
  ClipboardList,
  CookingPot,
  PackagePlus,
  Pill,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function sortOrdersForSupply(list: SupplyOrder[]): SupplyOrder[] {
  return [...list].sort((a, b) => {
    const aDeptPending =
      isDepartmentSupplyOrder(a) && a.status === 'yangi' ? 0 : 1;
    const bDeptPending =
      isDepartmentSupplyOrder(b) && b.status === 'yangi' ? 0 : 1;
    if (aDeptPending !== bDeptPending) {
      return aDeptPending - bDeptPending;
    }
    const aPending = a.status === 'yangi' ? 0 : 1;
    const bPending = b.status === 'yangi' ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

function PendingOrderActions({
  order,
  onAccept,
  onPurchase,
}: {
  order: SupplyOrder;
  onAccept: (id: string) => void;
  onPurchase: (order: SupplyOrder) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 font-semibold text-sky-700 hover:bg-sky-100"
        onClick={() => onAccept(order.id)}>
        <CheckCircle2 className="size-3.5" />
        Qabul qilish
      </Button>
      <Button
        type="button"
        size="sm"
        className="h-9 gap-1.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-3 font-semibold text-white"
        onClick={() => onPurchase(order)}>
        <PackagePlus className="size-3.5" />
        Sotib olindi
      </Button>
    </div>
  );
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(n);
}

function statusClass(status: SupplyOrderStatus): string {
  switch (status) {
    case 'yangi':
      return 'bg-amber-100 text-amber-800';
    case 'qabul_qilindi':
      return 'bg-sky-100 text-sky-800';
    case 'sotib_olindi':
      return 'bg-violet-100 text-violet-800';
    case 'omborda':
      return 'bg-emerald-100 text-emerald-800';
    case 'bekor':
      return 'bg-slate-100 text-slate-600';
  }
}

export default function SupplyWorkspace() {
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [purchases, setPurchases] = useState<SupplyPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    productName: '',
    quantity: '1',
    unit: 'dona',
    note: '',
    requestedBy: '',
  });

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({
    productName: '',
    quantity: '1',
    unit: 'dona',
    unitPrice: '',
    supplier: '',
    purchasedAt: todayIsoDate(),
    note: '',
    orderId: '',
  });

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      const [ordersRaw, purchasesRaw] = await Promise.all([
        fetchClinicResource<SupplyOrder[]>('supply-orders').catch(() => []),
        fetchClinicResource<SupplyPurchase[]>('supply-purchases').catch(
          () => [],
        ),
      ]);
      startTransition(() => {
        setOrders(
          sortOrdersForSupply(Array.isArray(ordersRaw) ? ordersRaw : []),
        );
        setPurchases(Array.isArray(purchasesRaw) ? purchasesRaw : []);
        setLoading(false);
      });
    } catch {
      setLoading(false);
      if (!opts?.silent) toast.error('Ma’lumotlar yuklanmadi');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      void load({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, 20_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [load]);

  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'yangi').length,
    [orders],
  );

  const kitchenPending = useMemo(
    () =>
      orders.filter(
        (o) => isKitchenSupplyOrder(o) && o.status === 'yangi',
      ),
    [orders],
  );

  const pharmacyPending = useMemo(
    () =>
      orders.filter(
        (o) => isPharmacySupplyOrder(o) && o.status === 'yangi',
      ),
    [orders],
  );

  async function persistOrders(next: SupplyOrder[]) {
    const sorted = sortOrdersForSupply(next);
    setOrders(sorted);
    try {
      const latestRaw = await fetchClinicResource<SupplyOrder[]>(
        'supply-orders',
      ).catch(() => null);
      if (Array.isArray(latestRaw)) {
        const byId = new Map(latestRaw.map((o) => [o.id, o]));
        for (const o of next) byId.set(o.id, o);
        const merged = sortOrdersForSupply([...byId.values()]);
        setOrders(merged);
        await saveClinicResource('supply-orders', merged);
        return;
      }
      await saveClinicResource('supply-orders', sorted);
    } catch {
      toast.error('Buyurtmalarni saqlab bo‘lmadi');
      await load({ silent: true });
    }
  }

  async function persistPurchases(next: SupplyPurchase[]) {
    setPurchases(next);
    try {
      await saveClinicResource('supply-purchases', next);
    } catch {
      toast.error('Xaridlarini saqlab bo‘lmadi');
    }
  }

  function openNewOrder() {
    setOrderForm({
      productName: '',
      quantity: '1',
      unit: 'dona',
      note: '',
      requestedBy: '',
    });
    setOrderOpen(true);
  }

  async function saveOrder() {
    const productName = orderForm.productName.trim();
    const quantity = Number.parseFloat(orderForm.quantity);
    const unit = orderForm.unit.trim() || 'dona';
    if (!productName) {
      toast.error('Mahsulot nomini kiriting');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Miqdor noto‘g‘ri');
      return;
    }
    const now = new Date().toISOString();
    const row: SupplyOrder = {
      id: newId(),
      productName,
      quantity,
      unit,
      note: orderForm.note.trim(),
      requestedBy: orderForm.requestedBy.trim() || 'Klinika',
      source: 'clinic',
      status: 'yangi',
      createdAt: now,
      updatedAt: now,
    };
    await persistOrders([row, ...orders]);
    setOrderOpen(false);
    toast.success('Buyurtma qo‘shildi');
  }

  async function setOrderStatus(id: string, status: SupplyOrderStatus) {
    const now = new Date().toISOString();
    const next = orders.map((o) =>
      o.id === id ? { ...o, status, updatedAt: now } : o,
    );
    await persistOrders(next);
    toast.success(`Holat: ${SUPPLY_ORDER_STATUS_LABELS[status]}`);
  }

  function openPurchaseFromOrder(order: SupplyOrder) {
    setPurchaseForm({
      productName: order.productName,
      quantity: String(order.quantity),
      unit: order.unit,
      unitPrice: '',
      supplier: '',
      purchasedAt: todayIsoDate(),
      note: '',
      orderId: order.id,
    });
    setPurchaseOpen(true);
  }

  function openNewPurchase() {
    setPurchaseForm({
      productName: '',
      quantity: '1',
      unit: 'dona',
      unitPrice: '',
      supplier: '',
      purchasedAt: todayIsoDate(),
      note: '',
      orderId: '',
    });
    setPurchaseOpen(true);
  }

  async function savePurchase() {
    const productName = purchaseForm.productName.trim();
    const quantity = Number.parseFloat(purchaseForm.quantity);
    const unitPrice = Number.parseFloat(purchaseForm.unitPrice || '0');
    const unit = purchaseForm.unit.trim() || 'dona';
    if (!productName) {
      toast.error('Mahsulot nomini kiriting');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Miqdor noto‘g‘ri');
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast.error('Narx noto‘g‘ri');
      return;
    }

    const row: SupplyPurchase = {
      id: newId(),
      productName,
      quantity,
      unit,
      unitPrice,
      supplier: purchaseForm.supplier.trim(),
      purchasedAt: purchaseForm.purchasedAt || todayIsoDate(),
      note: purchaseForm.note.trim(),
      orderId: purchaseForm.orderId,
      createdAt: new Date().toISOString(),
    };

    await persistPurchases([row, ...purchases]);

    if (purchaseForm.orderId) {
      const now = new Date().toISOString();
      await persistOrders(
        orders.map((o) =>
          o.id === purchaseForm.orderId
            ? { ...o, status: 'sotib_olindi', updatedAt: now }
            : o,
        ),
      );
    }

    setPurchaseOpen(false);
    toast.success(
      purchaseForm.orderId ?
        'Sotib olindi — buyurtmachi omborga qabul qilishi mumkin'
      : 'Sotib olingan mahsulot kiritildi',
    );
  }

  return (
    <div className="mt-3 space-y-5">
      <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/70 p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Ta&apos;minot kabineti
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Ta&apos;minot va xarid
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Oshxona, dorixona va klinika buyurtmalarini qabul qiling, so‘ng
              sotib olingan tovarlarni kiriting.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm shadow-sm ring-1 ring-orange-100">
              <p className="text-slate-500">Oshxona (yangi)</p>
              <p className="text-2xl font-bold text-orange-700">
                {loading ? '…' : kitchenPending.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm shadow-sm ring-1 ring-emerald-100">
              <p className="text-slate-500">Dorixona (yangi)</p>
              <p className="text-2xl font-bold text-emerald-700">
                {loading ? '…' : pharmacyPending.length}
              </p>
            </div>
            <div className="rounded-2xl bg-white/90 px-4 py-3 text-sm shadow-sm ring-1 ring-amber-100">
              <p className="text-slate-500">Yangi buyurtmalar</p>
              <p className="text-2xl font-bold text-amber-700">
                {loading ? '…' : pendingCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="orders" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-auto w-full gap-1.5 rounded-2xl border border-amber-100/80 bg-white/90 p-1.5 shadow-sm sm:w-auto">
            <TabsTrigger
              value="orders"
              className="group gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-linear-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/25">
              <ClipboardList className="size-4" />
              Buyurtmalar
              {!loading && pendingCount > 0 ?
                <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold tabular-nums text-amber-800 group-data-[state=active]:bg-white/25 group-data-[state=active]:text-white">
                  {pendingCount}
                </span>
              : null}
            </TabsTrigger>
            <TabsTrigger
              value="purchases"
              className="gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-linear-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/25">
              <ShoppingCart className="size-4" />
              Sotib olinganlar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders" className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-10 gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-4 font-semibold text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600"
              onClick={openNewOrder}>
              <Plus className="size-4" />
              Yangi buyurtma
            </Button>
          </div>

          {!loading && kitchenPending.length > 0 ?
            <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <CookingPot className="size-5 text-orange-700" />
                <div>
                  <p className="text-sm font-semibold text-orange-900">
                    Oshxonadan kelgan buyurtmalar
                  </p>
                  <p className="text-xs text-orange-800/80">
                    Oshpaz yuborgan yangi so‘rovlar — avval shularni ko‘ring
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {kitchenPending.map((order) => (
                  <li
                    key={`kitchen-${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-orange-100">
                    <div>
                      <p className="font-medium text-slate-800">
                        {order.productName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.quantity} {order.unit}
                        {order.requestedBy ? ` · ${order.requestedBy}` : ''}
                      </p>
                    </div>
                    <PendingOrderActions
                      order={order}
                      onAccept={(id) =>
                        void setOrderStatus(id, 'qabul_qilindi')
                      }
                      onPurchase={openPurchaseFromOrder}
                    />
                  </li>
                ))}
              </ul>
            </div>
          : null}

          {!loading && pharmacyPending.length > 0 ?
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Pill className="size-5 text-emerald-700" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Dorixonadan kelgan buyurtmalar
                  </p>
                  <p className="text-xs text-emerald-800/80">
                    Farmatsevt yuborgan yangi so‘rovlar — avval shularni ko‘ring
                  </p>
                </div>
              </div>
              <ul className="space-y-2">
                {pharmacyPending.map((order) => (
                  <li
                    key={`pharmacy-${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-emerald-100">
                    <div>
                      <p className="font-medium text-slate-800">
                        {order.productName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.quantity} {order.unit}
                        {order.requestedBy ? ` · ${order.requestedBy}` : ''}
                      </p>
                    </div>
                    <PendingOrderActions
                      order={order}
                      onAccept={(id) =>
                        void setOrderStatus(id, 'qabul_qilindi')
                      }
                      onPurchase={openPurchaseFromOrder}
                    />
                  </li>
                ))}
              </ul>
            </div>
          : null}

          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/90">
                  <TableHead>Mahsulot</TableHead>
                  <TableHead>Miqdor</TableHead>
                  <TableHead>So‘rovchi</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      Yuklanmoqda…
                    </TableCell>
                  </TableRow>
                : orders.length === 0 ?
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      Hali buyurtma yo‘q. Kerakli mahsulot uchun yangi buyurtma
                      yarating.
                    </TableCell>
                  </TableRow>
                : orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <p className="font-medium text-slate-800">
                          {order.productName}
                        </p>
                        {order.note ?
                          <p className="mt-0.5 text-xs text-slate-500">
                            {order.note}
                          </p>
                        : null}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {order.quantity} {order.unit}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm text-slate-700">
                            {order.requestedBy || '—'}
                          </p>
                          {isKitchenSupplyOrder(order) ?
                            <span className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-800">
                              Oshxona
                            </span>
                          : isPharmacySupplyOrder(order) ?
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                              Dorixona
                            </span>
                          : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(order.status)}`}>
                          {SUPPLY_ORDER_STATUS_LABELS[order.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {order.status === 'yangi' ?
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 font-semibold text-sky-700 shadow-sm hover:bg-sky-100 hover:text-sky-800"
                              onClick={() =>
                                void setOrderStatus(order.id, 'qabul_qilindi')
                              }>
                              <CheckCircle2 className="size-3.5" />
                              Qabul qilish
                            </Button>
                          : null}
                          {order.status === 'yangi' ||
                          order.status === 'qabul_qilindi' ?
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 gap-1.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-3 font-semibold text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
                              onClick={() => openPurchaseFromOrder(order)}>
                              <PackagePlus className="size-3.5" />
                              Sotib olindi
                            </Button>
                          : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              className="h-10 gap-2 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 px-4 font-semibold text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700"
              onClick={openNewPurchase}>
              <Plus className="size-4" />
              Mahsulot kiritish
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/90">
                  <TableHead>Mahsulot</TableHead>
                  <TableHead>Miqdor</TableHead>
                  <TableHead>Narx</TableHead>
                  <TableHead>Yetkazuvchi</TableHead>
                  <TableHead>Sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ?
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      Yuklanmoqda…
                    </TableCell>
                  </TableRow>
                : purchases.length === 0 ?
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-500">
                      Sotib olingan mahsulotlar hali kiritilmagan.
                    </TableCell>
                  </TableRow>
                : purchases.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <p className="font-medium text-slate-800">
                          {row.productName}
                        </p>
                        {row.note ?
                          <p className="mt-0.5 text-xs text-slate-500">
                            {row.note}
                          </p>
                        : null}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.quantity} {row.unit}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(row.unitPrice)} so‘m
                      </TableCell>
                      <TableCell>{row.supplier || '—'}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.purchasedAt}
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi xarid buyurtmasi</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Mahsulot nomi</Label>
              <Input
                value={orderForm.productName}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, productName: e.target.value }))
                }
                placeholder="Masalan: Steril qo‘lqop"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Miqdor</Label>
                <Input
                  type="number"
                  min={0.01}
                  step="any"
                  value={orderForm.quantity}
                  onChange={(e) =>
                    setOrderForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>O‘lchov</Label>
                <Input
                  value={orderForm.unit}
                  onChange={(e) =>
                    setOrderForm((f) => ({ ...f, unit: e.target.value }))
                  }
                  placeholder="dona / quti"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>So‘rovchi</Label>
              <Input
                value={orderForm.requestedBy}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, requestedBy: e.target.value }))
                }
                placeholder="Bo‘lim yoki xodim"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Textarea
                value={orderForm.note}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, note: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOrderOpen(false)}>
              Bekor
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-linear-to-r from-amber-500 to-orange-500 font-semibold text-white hover:from-amber-600 hover:to-orange-600"
              onClick={() => void saveOrder()}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sotib olingan mahsulot</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label>Mahsulot nomi</Label>
              <Input
                value={purchaseForm.productName}
                onChange={(e) =>
                  setPurchaseForm((f) => ({
                    ...f,
                    productName: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Miqdor</Label>
                <Input
                  type="number"
                  min={0.01}
                  step="any"
                  value={purchaseForm.quantity}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({
                      ...f,
                      quantity: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>O‘lchov</Label>
                <Input
                  value={purchaseForm.unit}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({ ...f, unit: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Birlik narxi (so‘m)</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={purchaseForm.unitPrice}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({
                      ...f,
                      unitPrice: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sana</Label>
                <Input
                  type="date"
                  value={purchaseForm.purchasedAt}
                  onChange={(e) =>
                    setPurchaseForm((f) => ({
                      ...f,
                      purchasedAt: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Yetkazuvchi / do‘kon</Label>
              <Input
                value={purchaseForm.supplier}
                onChange={(e) =>
                  setPurchaseForm((f) => ({ ...f, supplier: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Textarea
                value={purchaseForm.note}
                onChange={(e) =>
                  setPurchaseForm((f) => ({ ...f, note: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setPurchaseOpen(false)}>
              Bekor
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 font-semibold text-white hover:from-emerald-600 hover:to-teal-700"
              onClick={() => void savePurchase()}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
