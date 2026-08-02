'use client';

import PharmacyProductsPanel from '@/components/pharmacy/PharmacyProductsPanel';
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
import { fetchClinicResource } from '@/lib/clinic-data/client';
import {
  PHARMACY_CATEGORY_DEFS,
  type PharmacyProduct,
} from '@/lib/pharmacy/types';
import { receiveSupplyOrderToStock } from '@/lib/supply/receive-order-client';
import {
  isAwaitingDepartmentReceipt,
  isPharmacySupplyOrder,
  SUPPLY_ORDER_STATUS_LABELS,
  type SupplyOrder,
} from '@/lib/supply/types';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  PackagePlus,
  Pill,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/** Quti soni shu qiymatdan past yoki teng — kam qolgan */
const LOW_STOCK_MAX = 5;

function isLowStock(p: PharmacyProduct): boolean {
  return Number(p.packageCount) <= LOW_STOCK_MAX;
}

function isOutOfStock(p: PharmacyProduct): boolean {
  return Number(p.packageCount) <= 0;
}

export default function FarmatsevtWorkspace() {
  const [pharmacistName, setPharmacistName] = useState('Farmatsevt');
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    productName: '',
    quantity: '1',
    unit: 'dona',
    note: '',
  });
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [stockKey, setStockKey] = useState(0);

  const loadMeta = useCallback(async () => {
    try {
      const [productsRaw, ordersRaw, meRes] = await Promise.all([
        fetchClinicResource<PharmacyProduct[]>('pharmacy-products').catch(
          () => [],
        ),
        fetchClinicResource<SupplyOrder[]>('supply-orders').catch(() => []),
        fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }),
      ]);
      const me = (await meRes.json().catch(() => ({}))) as {
        fullName?: string;
      };
      if (typeof me.fullName === 'string' && me.fullName.trim()) {
        setPharmacistName(me.fullName.trim());
      }
      const nextProducts = Array.isArray(productsRaw) ? productsRaw : [];
      const nextOrders = (Array.isArray(ordersRaw) ? ordersRaw : [])
        .filter(isPharmacySupplyOrder)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      startTransition(() => {
        setProducts(nextProducts);
        setOrders(nextOrders);
        setLoadingMeta(false);
      });
    } catch {
      setLoadingMeta(false);
      toast.error('Ma’lumotlar yuklanmadi');
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const onFocus = () => {
      void loadMeta();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadMeta]);

  const lowStock = useMemo(
    () =>
      products
        .filter(isLowStock)
        .sort((a, b) => Number(a.packageCount) - Number(b.packageCount)),
    [products],
  );

  const outCount = useMemo(
    () => lowStock.filter(isOutOfStock).length,
    [lowStock],
  );

  const awaitingReceipt = useMemo(
    () => orders.filter(isAwaitingDepartmentReceipt),
    [orders],
  );

  async function receiveOrder(orderId: string) {
    setReceivingId(orderId);
    try {
      const result = await receiveSupplyOrderToStock(orderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Dori omborga qo‘shildi');
      setStockKey((k) => k + 1);
      await loadMeta();
    } finally {
      setReceivingId(null);
    }
  }

  function openOrderFromProduct(p?: PharmacyProduct) {
    const qty =
      p && isOutOfStock(p) ? '10'
      : p ? String(Math.max(5, LOW_STOCK_MAX * 2 - Number(p.packageCount)))
      : '1';
    setOrderForm({
      productName: p?.name ?? '',
      quantity: qty,
      unit: p?.unit?.trim() || 'dona',
      note:
        p ?
          isOutOfStock(p) ?
            'Dorixona: qoldiq tugagan'
          : `Dorixona qoldig‘i: ${p.packageCount} ${p.unit || 'dona'}`
        : '',
    });
    setOrderOpen(true);
  }

  async function submitOrder() {
    const productName = orderForm.productName.trim();
    const quantity = Number(orderForm.quantity);
    if (!productName) {
      toast.error('Dori / mahsulot nomini kiriting');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Miqdor noto‘g‘ri');
      return;
    }

    try {
      const res = await fetch('/api/supply/orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          quantity,
          unit: orderForm.unit.trim() || 'dona',
          note: orderForm.note.trim(),
          requestedBy: `Dorixona · ${pharmacistName}`,
          source: 'pharmacy',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        order?: SupplyOrder;
      };
      if (!res.ok) {
        toast.error(data.error || 'Buyurtma saqlanmadi');
        return;
      }
      if (data.order) {
        setOrders((prev) =>
          [data.order!, ...prev.filter((o) => o.id !== data.order!.id)].sort(
            (a, b) => b.createdAt.localeCompare(a.createdAt),
          ),
        );
      } else {
        await loadMeta();
      }
      toast.success('Buyurtma Ta’minot xodimiga yuborildi');
      setOrderOpen(false);
    } catch {
      toast.error('Buyurtma saqlanmadi');
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dorixona boshqaruvi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Kam qolgan yoki tugagan dorilar uchun Ta&apos;minotga buyurtma bering.
        </p>
      </div>

      {!loadingMeta && awaitingReceipt.length > 0 ?
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <PackageCheck className="size-5 text-emerald-700" />
            <div>
              <p className="font-semibold">
                Ta&apos;minot sotib oldi — omborga qabul qiling
              </p>
              <p className="text-xs text-emerald-800/80">
                Qabul qilgach miqdor dorixona qoldig‘iga qo‘shiladi
              </p>
            </div>
          </div>
          <ul className="space-y-2">
            {awaitingReceipt.map((o) => (
              <li
                key={`recv-${o.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-emerald-100">
                <div>
                  <p className="font-medium text-slate-800">{o.productName}</p>
                  <p className="text-xs text-slate-500">
                    {o.quantity} {o.unit}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  disabled={receivingId === o.id}
                  onClick={() => void receiveOrder(o.id)}>
                  <CheckCircle2 className="size-3.5" />
                  {receivingId === o.id ? 'Qabul…' : 'Omborga qabul qildim'}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {!loadingMeta && lowStock.length > 0 ?
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p>
              <span className="font-semibold">{lowStock.length} ta dori</span>{' '}
              kam qolgan
              {outCount > 0 ?
                <>
                  {' '}
                  (<span className="font-semibold">{outCount} ta</span> tugagan)
                </>
              : null}
              — Ta&apos;minotga buyurtma bering.
            </p>
            <ul className="mt-2 space-y-1.5">
              {lowStock.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-amber-100">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Qoldiq:{' '}
                      <span
                        className={cn(
                          'font-semibold',
                          isOutOfStock(p) ? 'text-red-700' : 'text-amber-800',
                        )}>
                        {p.packageCount} {p.unit || 'dona'}
                      </span>
                      {PHARMACY_CATEGORY_DEFS.find((c) => c.id === p.category)
                        ?.label ?
                        ` · ${PHARMACY_CATEGORY_DEFS.find((c) => c.id === p.category)?.label}`
                      : null}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0 gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => openOrderFromProduct(p)}>
                    <ShoppingCart className="size-3.5" />
                    Buyurtma
                  </Button>
                </li>
              ))}
            </ul>
            {lowStock.length > 8 ?
              <p className="mt-2 text-xs text-amber-800/80">
                Yana {lowStock.length - 8} ta… quyida mahsulotlar ro‘yxatidan
                buyurtma bering.
              </p>
            : null}
          </div>
        </div>
      : null}

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="rounded-xl bg-emerald-50/80 p-1">
          <TabsTrigger value="stock" className="gap-1.5 rounded-lg">
            <Pill className="size-3.5" />
            Mahsulotlar
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 rounded-lg">
            <ShoppingCart className="size-3.5" />
            Buyurtmalar
            {orders.filter((o) => o.status === 'yangi').length > 0 ?
              <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-[11px] font-bold text-emerald-800">
                {orders.filter((o) => o.status === 'yangi').length}
              </span>
            : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-emerald-200"
              onClick={() => openOrderFromProduct()}>
              <PackagePlus className="size-4" />
              Ta&apos;minotga buyurtma
            </Button>
          </div>
          <PharmacyProductsPanel key={stockKey} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              onClick={() => openOrderFromProduct()}>
              <Plus className="size-4" />
              Yangi buyurtma
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
            {loadingMeta ?
              <p className="px-4 py-12 text-center text-sm text-slate-500">
                Yuklanmoqda…
              </p>
            : orders.length === 0 ?
              <p className="px-4 py-12 text-center text-sm text-slate-500">
                Hali Ta&apos;minotga yuborilgan buyurtma yo‘q.
              </p>
            : <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Miqdor</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Sana</TableHead>
                    <TableHead className="text-right">Amal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <p className="font-medium text-slate-800">
                          {o.productName}
                        </p>
                        {o.note ?
                          <p className="text-xs text-slate-500">{o.note}</p>
                        : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {o.quantity} {o.unit}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            o.status === 'sotib_olindi' ?
                              'bg-emerald-100 text-emerald-800'
                            : o.status === 'omborda' ?
                              'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-700',
                          )}>
                          {SUPPLY_ORDER_STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(o.createdAt).toLocaleString('uz-UZ')}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAwaitingDepartmentReceipt(o) ?
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700"
                            disabled={receivingId === o.id}
                            onClick={() => void receiveOrder(o.id)}>
                            <CheckCircle2 className="size-3.5" />
                            Qabul
                          </Button>
                        : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ta&apos;minotga buyurtma</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label>Dori / mahsulot</Label>
              <Input
                value={orderForm.productName}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, productName: e.target.value }))
                }
                list="pharmacy-order-names"
                placeholder="Masalan: Metformin 500"
              />
              <datalist id="pharmacy-order-names">
                {products.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Miqdor</Label>
                <Input
                  type="number"
                  min={1}
                  step="1"
                  value={orderForm.quantity}
                  onChange={(e) =>
                    setOrderForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Birlik</Label>
                <Input
                  value={orderForm.unit}
                  onChange={(e) =>
                    setOrderForm((f) => ({ ...f, unit: e.target.value }))
                  }
                  placeholder="dona / quti"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Izoh</Label>
              <Textarea
                value={orderForm.note}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, note: e.target.value }))
                }
                rows={2}
                placeholder="Ixtiyoriy"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOrderOpen(false)}>
              Bekor
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void submitOrder()}>
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
