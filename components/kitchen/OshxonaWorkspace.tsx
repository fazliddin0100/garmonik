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
  normalizeKitchenProduct,
  type KitchenProduct,
} from '@/lib/kitchen/types';
import { receiveSupplyOrderToStock } from '@/lib/supply/receive-order-client';
import {
  isAwaitingDepartmentReceipt,
  isKitchenSupplyOrder,
  SUPPLY_ORDER_STATUS_LABELS,
  type SupplyOrder,
} from '@/lib/supply/types';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  CookingPot,
  PackageCheck,
  PackagePlus,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

function newId(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export default function OshxonaWorkspace() {
  const [cookName, setCookName] = useState('Oshpaz');
  const [products, setProducts] = useState<KitchenProduct[]>([]);
  const [orders, setOrders] = useState<SupplyOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [productOpen, setProductOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    unit: 'kg',
    remainingQty: '0',
    minQty: '0',
    note: '',
  });

  const [orderOpen, setOrderOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    productName: '',
    quantity: '1',
    unit: 'kg',
    note: '',
  });

  const load = useCallback(async () => {
    try {
      const [productsRaw, ordersRaw, meRes] = await Promise.all([
        fetchClinicResource<unknown>('kitchen-products').catch(() => []),
        fetchClinicResource<SupplyOrder[]>('supply-orders').catch(() => []),
        fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' }),
      ]);
      const me = (await meRes.json().catch(() => ({}))) as {
        fullName?: string;
      };
      if (typeof me.fullName === 'string' && me.fullName.trim()) {
        setCookName(me.fullName.trim());
      }
      const nextProducts = (Array.isArray(productsRaw) ? productsRaw : [])
        .map(normalizeKitchenProduct)
        .filter((p): p is KitchenProduct => p !== null)
        .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
      const nextOrders = (Array.isArray(ordersRaw) ? ordersRaw : [])
        .filter(isKitchenSupplyOrder)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      startTransition(() => {
        setProducts(nextProducts);
        setOrders(nextOrders);
        setLoading(false);
      });
    } catch {
      setLoading(false);
      toast.error('Ma’lumotlar yuklanmadi');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => {
      void load();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const lowStock = useMemo(
    () => products.filter((p) => p.remainingQty <= p.minQty),
    [products],
  );

  const awaitingReceipt = useMemo(
    () => orders.filter(isAwaitingDepartmentReceipt),
    [orders],
  );

  const [receivingId, setReceivingId] = useState<string | null>(null);

  async function receiveOrder(orderId: string) {
    setReceivingId(orderId);
    try {
      const result = await receiveSupplyOrderToStock(orderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Mahsulot omborga qo‘shildi');
      await load();
    } finally {
      setReceivingId(null);
    }
  }

  async function persistProducts(next: KitchenProduct[]) {
    setProducts(next);
    try {
      await saveClinicResource('kitchen-products', next);
    } catch {
      toast.error('Mahsulotlar saqlanmadi');
      await load();
    }
  }

  function openNewProduct() {
    setEditingId(null);
    setProductForm({
      name: '',
      unit: 'kg',
      remainingQty: '0',
      minQty: '0',
      note: '',
    });
    setProductOpen(true);
  }

  function openEditProduct(p: KitchenProduct) {
    setEditingId(p.id);
    setProductForm({
      name: p.name,
      unit: p.unit,
      remainingQty: String(p.remainingQty),
      minQty: String(p.minQty),
      note: p.note,
    });
    setProductOpen(true);
  }

  async function saveProduct() {
    const name = productForm.name.trim();
    if (!name) {
      toast.error('Mahsulot nomini kiriting');
      return;
    }
    const remainingQty = Number(productForm.remainingQty);
    const minQty = Number(productForm.minQty);
    if (!Number.isFinite(remainingQty) || remainingQty < 0) {
      toast.error('Qoldiq noto‘g‘ri');
      return;
    }
    const row: KitchenProduct = {
      id: editingId || newId(),
      name,
      unit: productForm.unit.trim() || 'kg',
      remainingQty,
      minQty: Number.isFinite(minQty) && minQty >= 0 ? minQty : 0,
      note: productForm.note.trim(),
      updatedAt: nowIso(),
    };
    const next =
      editingId ?
        products.map((p) => (p.id === editingId ? row : p))
      : [...products, row];
    await persistProducts(
      next.sort((a, b) => a.name.localeCompare(b.name, 'uz')),
    );
    toast.success(editingId ? 'Mahsulot yangilandi' : 'Mahsulot qo‘shildi');
    setProductOpen(false);
  }

  async function deleteProduct(id: string) {
    await persistProducts(products.filter((p) => p.id !== id));
    toast.success('Mahsulot o‘chirildi');
  }

  function openOrderFromProduct(p?: KitchenProduct) {
    setOrderForm({
      productName: p?.name ?? '',
      quantity: p && p.minQty > 0 ? String(Math.max(1, p.minQty * 2)) : '1',
      unit: p?.unit ?? 'kg',
      note: p ? `Oshxona qoldig‘i: ${p.remainingQty} ${p.unit}` : '',
    });
    setOrderOpen(true);
  }

  async function submitOrder() {
    const productName = orderForm.productName.trim();
    const quantity = Number(orderForm.quantity);
    if (!productName) {
      toast.error('Mahsulot nomini kiriting');
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
          unit: orderForm.unit.trim() || 'kg',
          note: orderForm.note.trim(),
          requestedBy: `Oshxona · ${cookName}`,
          source: 'kitchen',
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
        await load();
      }
      toast.success('Buyurtma Ta’minot xodimiga yuborildi');
      setOrderOpen(false);
    } catch {
      toast.error('Buyurtma saqlanmadi');
    }
  }

  if (loading) {
    return (
      <p className="py-16 text-center text-sm text-slate-500">Yuklanmoqda…</p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Oshxona boshqaruvi</h2>
        <p className="mt-1 text-sm text-slate-600">
          Mahsulot qoldig‘ini kuzating va keraklisini Ta&apos;minotga buyurtma
          qiling.
        </p>
      </div>

      {awaitingReceipt.length > 0 ?
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <PackageCheck className="size-5 text-emerald-700" />
            <div>
              <p className="font-semibold">
                Ta&apos;minot sotib oldi — omborga qabul qiling
              </p>
              <p className="text-xs text-emerald-800/80">
                Qabul qilgach miqdor oshxona qoldig‘iga qo‘shiladi
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

      {lowStock.length > 0 ?
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">{lowStock.length} ta mahsulot</span>{' '}
            minimal zaxiradan past — buyurtma berishni ko‘rib chiqing.
          </p>
        </div>
      : null}

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className="rounded-xl bg-orange-50/80 p-1">
          <TabsTrigger value="stock" className="rounded-lg gap-1.5">
            <CookingPot className="size-3.5" />
            Qoldiq
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-lg gap-1.5">
            <ShoppingCart className="size-3.5" />
            Buyurtmalar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => openOrderFromProduct()}>
              <PackagePlus className="size-4" />
              Ta&apos;minotga buyurtma
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-orange-600 hover:bg-orange-700"
              onClick={openNewProduct}>
              <Plus className="size-4" />
              Mahsulot qo‘shish
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            {products.length === 0 ?
              <p className="px-4 py-12 text-center text-sm text-slate-500">
                Hozircha mahsulot yo‘q. Avval oshxona mahsulotlarini kiriting.
              </p>
            : <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Mahsulot</TableHead>
                    <TableHead>Qoldiq</TableHead>
                    <TableHead>Min.</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const low = p.remainingQty <= p.minQty;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium text-slate-800">{p.name}</p>
                          {p.note ?
                            <p className="text-xs text-slate-500">{p.note}</p>
                          : null}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                              low ?
                                'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800',
                            )}>
                            {p.remainingQty} {p.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {p.minQty} {p.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              title="Buyurtma"
                              onClick={() => openOrderFromProduct(p)}>
                              <ShoppingCart className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => openEditProduct(p)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => void deleteProduct(p.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            }
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-3">
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-xl bg-orange-600 hover:bg-orange-700"
              onClick={() => openOrderFromProduct()}>
              <Plus className="size-4" />
              Yangi buyurtma
            </Button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            {orders.length === 0 ?
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

      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label>Nomi</Label>
              <Input
                value={productForm.name}
                onChange={(e) =>
                  setProductForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Masalan: Guruch"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Qoldiq</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={productForm.remainingQty}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      remainingQty: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Min.</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={productForm.minQty}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, minQty: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Birlik</Label>
                <Input
                  value={productForm.unit}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, unit: e.target.value }))
                  }
                  placeholder="kg"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Izoh</Label>
              <Textarea
                rows={2}
                value={productForm.note}
                onChange={(e) =>
                  setProductForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductOpen(false)}>
              Bekor
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => void saveProduct()}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ta&apos;minotga buyurtma</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label>Mahsulot</Label>
              <Input
                value={orderForm.productName}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, productName: e.target.value }))
                }
                list="kitchen-product-names"
              />
              <datalist id="kitchen-product-names">
                {products.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
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
              <div className="grid gap-1.5">
                <Label>Birlik</Label>
                <Input
                  value={orderForm.unit}
                  onChange={(e) =>
                    setOrderForm((f) => ({ ...f, unit: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Izoh</Label>
              <Textarea
                rows={2}
                value={orderForm.note}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, note: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderOpen(false)}>
              Bekor
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => void submitOrder()}>
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
