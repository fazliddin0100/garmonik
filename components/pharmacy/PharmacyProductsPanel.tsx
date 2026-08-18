'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  USERS_STAFF_FIELD_CLASS,
  UsersStaffFieldLabel,
  UsersStaffFormDialog,
  UsersStaffFormSection,
} from '@/components/users/users-staff-ui';
import { cn } from '@/lib/utils';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import {
  PHARMACY_CATEGORY_DEFS,
  mergePharmacyCatalog,
  normalizePharmacyCategory,
  type PharmacyCategoryId,
  type PharmacyProduct,
} from '@/lib/pharmacy/types';
import { INITIAL_PHARMACY_PRODUCTS } from '@/lib/pharmacy/initial-data';
import {
  Boxes,
  Layers,
  LayoutGrid,
  Package,
  Pencil,
  Ruler,
  Search,
  Shapes,
  Tags,
  Trash2,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const ALL_TAB = 'all';

const ACTION_BTN_BASE =
  'size-8 shrink-0 rounded-lg border shadow-sm transition-all duration-150';

const ACTION_EDIT_CLASS = cn(
  ACTION_BTN_BASE,
  'border-violet-200/80 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800',
);

const ACTION_DELETE_CLASS = cn(
  ACTION_BTN_BASE,
  'border-rose-200/80 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700',
);

type PharmacyProductForm = {
  name: string;
  unit: string;
  group: string;
  type: string;
  packageCount: string;
  category: PharmacyCategoryId;
};

function emptyForm(): PharmacyProductForm {
  return {
    name: '',
    unit: '',
    group: '',
    type: '',
    packageCount: '',
    category: 'infusions',
  };
}

function nextRowNum(products: PharmacyProduct[]): number {
  return products.reduce((max, product) => Math.max(max, product.rowNum), 0) + 1;
}

function productSearchHaystack(p: PharmacyProduct): string {
  const catLabel =
    PHARMACY_CATEGORY_DEFS.find((c) => c.id === p.category)?.label ?? '';
  return [
    p.id,
    p.barcode,
    String(p.rowNum),
    p.name,
    p.unit,
    p.group,
    p.type,
    String(p.packageCount),
    p.status,
    p.category,
    catLabel,
  ]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

export default function PharmacyProductsPanel() {
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PharmacyProductForm>(emptyForm());
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const skipFirstPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const next =
            await fetchClinicResource<PharmacyProduct[]>('pharmacy-products');
          const existing = Array.isArray(next) ? next : [];
          const { products: merged, added } = mergePharmacyCatalog(
            existing,
            INITIAL_PHARMACY_PRODUCTS,
          );
          startTransition(() => {
            if (cancelled) return;
            setProducts(merged);
            setHydrated(true);
          });
          if (added > 0) {
            try {
              await saveClinicResource('pharmacy-products', merged);
            } catch {
              /* keyingi persist effect saqlashi mumkin */
            }
          }
        } catch {
          startTransition(() => {
            if (cancelled) return;
            setProducts([...INITIAL_PHARMACY_PRODUCTS]);
            setHydrated(true);
          });
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    void (async () => {
      try {
        await saveClinicResource('pharmacy-products', products);
      } catch {
        toast.error('Mahsulotlarni saqlab bo‘lmadi');
      }
    })();
  }, [products, hydrated]);

  const tabFiltered = useMemo(() => {
    if (activeTab === ALL_TAB) return products;
    return products.filter((p) => p.category === activeTab);
  }, [products, activeTab]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((p) => productSearchHaystack(p).includes(q));
  }, [tabFiltered, searchQuery]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.category, (map.get(p.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const deleteTarget = useMemo(
    () => products.find((p) => p.id === deleteId) ?? null,
    [products, deleteId],
  );

  function openCreate() {
    setEditingId(null);
    setFormError('');
    setForm({
      ...emptyForm(),
      category:
        activeTab !== ALL_TAB ? (activeTab as PharmacyCategoryId) : 'infusions',
    });
    setEditOpen(true);
  }

  function openEdit(p: PharmacyProduct) {
    setEditingId(p.id);
    setFormError('');
    setForm({
      name: p.name,
      unit: p.unit,
      group: p.group,
      type: p.type,
      packageCount: String(p.packageCount),
      category: normalizePharmacyCategory(p.category),
    });
    setEditOpen(true);
  }

  function saveProduct() {
    const name = form.name.trim();
    if (!name) {
      setFormError('Mahsulot nomi majburiy.');
      return;
    }

    const packageCount = Math.max(0, parseInt(form.packageCount, 10) || 0);
    const existing = editingId ? products.find((p) => p.id === editingId) : null;
    setFormError('');
    const payload: PharmacyProduct = {
      id: editingId ?? `pharm-${Date.now()}`,
      barcode: existing?.barcode ?? '',
      rowNum: existing?.rowNum ?? nextRowNum(products),
      name: form.name.trim(),
      unit: form.unit.trim(),
      group: form.group.trim(),
      type: form.type.trim(),
      packageCount,
      status: existing?.status ?? 'Актив',
      category: form.category,
    };

    if (editingId) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingId ? payload : p)),
      );
    } else {
      setProducts((prev) => [...prev, payload]);
    }
    setEditOpen(false);
    setEditingId(null);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3">
        <div className="relative w-full max-w-md min-w-0 sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qidirish: nom, guruh, tur, holat, kategoriya…"
            className="h-10 rounded-xl border-violet-200/80 bg-white pl-9 shadow-sm"
            aria-label="Mahsulotlar bo‘yicha qidiruv"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 bg-violet-600 text-white hover:bg-violet-700"
          onClick={openCreate}>
          ➕ Yangi qator
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <TabsList
          variant="line"
          className="!h-auto !w-full flex-wrap justify-start gap-2 overflow-visible bg-transparent p-0">
          <TabsTrigger
            value={ALL_TAB}
            className="group inline-flex !h-auto min-h-10 !flex-none items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/60 data-[state=active]:border-violet-600 data-[state=active]:bg-violet-600 data-[state=active]:!text-black data-active:!text-black data-[state=active]:shadow-md">
            Barchasi
            <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600 group-data-[state=active]:bg-white/90 group-data-[state=active]:!text-black group-data-active:!text-black">
              {products.length}
            </span>
          </TabsTrigger>
          {PHARMACY_CATEGORY_DEFS.map((c) => {
            const count = categoryCounts.get(c.id) ?? 0;
            return (
              <TabsTrigger
                key={c.id}
                value={c.id}
                className="group inline-flex !h-auto min-h-10 !flex-none items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-50/60 data-[state=active]:border-violet-600 data-[state=active]:bg-violet-600 data-[state=active]:!text-black data-active:!text-black data-[state=active]:shadow-md">
                {c.label}
                <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600 group-data-[state=active]:bg-white/90 group-data-[state=active]:!text-black group-data-active:!text-black">
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-lg backdrop-blur">
        <div className="max-h-[calc(100dvh-18rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/90">
            <TableRow className="border-slate-200/80 hover:bg-transparent">
              <TableHead className="whitespace-nowrap text-xs font-semibold text-slate-600">
                T/r
              </TableHead>
              <TableHead className="min-w-45 text-xs font-semibold text-slate-600">
                Nomi
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-semibold text-slate-600">
                O&apos;lchov
              </TableHead>
              <TableHead className="min-w-30 text-xs font-semibold text-slate-600">
                Guruh
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-semibold text-slate-600">
                Turi
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-semibold text-slate-600">
                Upakovka
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-semibold text-slate-600">
                Holati
              </TableHead>
              <TableHead className="whitespace-nowrap text-right text-xs font-semibold text-slate-600">
                Amallar
              </TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {products.length === 0 ?
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-slate-500">
                  Hozircha mahsulot yozuvi yo&apos;q.
                </TableCell>
              </TableRow>
            : tabFiltered.length === 0 ?
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-slate-500">
                  Bu kategoriyada yozuv yo&apos;q.
                </TableCell>
              </TableRow>
            : filtered.length === 0 ?
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-slate-500">
                  Qidiruv bo‘yicha natija yo‘q.
                </TableCell>
              </TableRow>
            : filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="border-slate-100 text-sm text-slate-700">
                  <TableCell className="tabular-nums">{p.rowNum}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-xs">{p.unit}</TableCell>
                  <TableCell className="text-xs">{p.group}</TableCell>
                  <TableCell className="text-xs">{p.type}</TableCell>
                  <TableCell className="tabular-nums">
                    {p.packageCount}
                  </TableCell>
                  <TableCell className="text-xs ">
                    <span className="bg-green-200/50 text-green-800 rounded p-1">
                      {p.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50/80 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className={ACTION_EDIT_CLASS}
                        aria-label="Tahrirlash"
                        title="Tahrirlash"
                        onClick={() => openEdit(p)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className={ACTION_DELETE_CLASS}
                        aria-label="Ochirish"
                        title="O‘chirish"
                        onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            }
            </TableBody>
          </Table>
        </div>
      </div>

      <UsersStaffFormDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setFormError('');
        }}
        editing={!!editingId}
        icon={Package}
        createTitle="Yangi mahsulot"
        editTitle="Mahsulotni tahrirlash"
        createDescription="Farmatsevtika katalogiga yangi pozitsiya qo‘shing."
        editDescription="Mahsulot ma’lumotlarini yangilang."
        createSaveLabel="Mahsulot qo‘shish"
        onSave={saveProduct}
        error={formError || undefined}>
        <UsersStaffFormSection title="Asosiy ma’lumotlar" icon={Package} variant="violet">
          <div className="grid gap-4">
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="ph-name" icon={Tags}>
                Nomi
              </UsersStaffFieldLabel>
              <Input
                id="ph-name"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Masalan: Metformin 500 mg"
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="ph-category" icon={LayoutGrid}>
                Kategoriya
              </UsersStaffFieldLabel>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    category: v as PharmacyCategoryId,
                  }))
                }>
                <SelectTrigger
                  id="ph-category"
                  className={cn(USERS_STAFF_FIELD_CLASS, 'w-full')}
                  aria-label="Mahsulot kategoriyasi">
                  <SelectValue placeholder="Kategoriyani tanlang" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {PHARMACY_CATEGORY_DEFS.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="rounded-lg">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </UsersStaffFormSection>

        <UsersStaffFormSection title="Tafsilotlar" icon={Layers}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="ph-unit" icon={Ruler}>
                O&apos;lchov birligi
              </UsersStaffFieldLabel>
              <Input
                id="ph-unit"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
                }
                placeholder="dona, quti, ml..."
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="ph-pack" icon={Boxes}>
                Upakovka soni
              </UsersStaffFieldLabel>
              <Input
                id="ph-pack"
                inputMode="numeric"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.packageCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, packageCount: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="ph-group" icon={Layers}>
                Guruh
              </UsersStaffFieldLabel>
              <Input
                id="ph-group"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.group}
                onChange={(e) =>
                  setForm((f) => ({ ...f, group: e.target.value }))
                }
                placeholder="Dori guruhi"
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="ph-type" icon={Shapes}>
                Turi
              </UsersStaffFieldLabel>
              <Input
                id="ph-type"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
                placeholder="Tabletka, ampula..."
              />
            </div>
          </div>
        </UsersStaffFormSection>
      </UsersStaffFormDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mahsulotni o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `“${deleteTarget.name}” o‘chirilsinmi? Bu amalni qaytarib bo‘lmaydi.`
              : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDelete}>
              O&apos;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
