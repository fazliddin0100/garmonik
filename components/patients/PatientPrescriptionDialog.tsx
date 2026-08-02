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
import { Textarea } from '@/components/ui/textarea';
import { fetchClinicResource } from '@/lib/clinic-data/client';
import { cn } from '@/lib/utils';
import {
  PHARMACY_CATEGORY_DEFS,
  type PharmacyProduct,
} from '@/lib/pharmacy/types';
import type {
  PatientPrescription,
  PatientPrescriptionItem,
} from '@/lib/patients/prescriptions';
import { Pill, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const ALL_TAB = 'all';

type DraftItem = PatientPrescriptionItem & { draftKey: string };

function productHaystack(p: PharmacyProduct): string {
  const catLabel = PHARMACY_CATEGORY_DEFS.find((c) => c.id === p.category)?.label ?? '';
  return [p.name, p.group, p.unit, p.type, catLabel].join(' ').toLowerCase();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  onSave: (prescription: PatientPrescription) => void | Promise<void>;
  saving?: boolean;
  actorName?: string;
  actorLogin?: string;
};

export default function PatientPrescriptionDialog({
  open,
  onOpenChange,
  patientName,
  onSave,
  saving = false,
  actorName = '',
  actorLogin = '',
}: Props) {
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(ALL_TAB);
  const [selected, setSelected] = useState<DraftItem[]>([]);
  const [generalNote, setGeneralNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setCategory(ALL_TAB);
    setSelected([]);
    setGeneralNote('');
    setLoadingProducts(true);
    void fetchClinicResource<PharmacyProduct[]>('pharmacy-products')
      .then((rows) => {
        setProducts(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        setProducts([]);
        toast.error('Mahsulotlar ro‘yxati yuklanmadi');
      })
      .finally(() => setLoadingProducts(false));
  }, [open]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== ALL_TAB && p.category !== category) return false;
      if (!q) return true;
      return productHaystack(p).includes(q);
    });
  }, [products, search, category]);

  function addProduct(product: PharmacyProduct) {
    if (selected.some((s) => s.productId === product.id)) {
      toast.message('Bu dori allaqachon ro‘yxatda');
      return;
    }
    setSelected((prev) => [
      ...prev,
      {
        draftKey: product.id,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        dosage: '',
        duration: '',
        quantity: undefined,
        note: '',
      },
    ]);
  }

  function updateItem(draftKey: string, patch: Partial<DraftItem>) {
    setSelected((prev) =>
      prev.map((item) => (item.draftKey === draftKey ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(draftKey: string) {
    setSelected((prev) => prev.filter((item) => item.draftKey !== draftKey));
  }

  async function handleSave() {
    if (selected.length === 0) {
      toast.error('Kamida bitta dori tanlang');
      return;
    }
    const items: PatientPrescriptionItem[] = selected.map(
      ({ draftKey: _k, productId, productName, unit, dosage, duration, quantity, note }) => ({
        productId,
        productName,
        unit,
        dosage: dosage?.trim() || undefined,
        duration: duration?.trim() || undefined,
        quantity: quantity && quantity > 0 ? quantity : undefined,
        note: note?.trim() || undefined,
      }),
    );
    const prescription: PatientPrescription = {
      id: crypto.randomUUID(),
      prescribedAt: new Date().toISOString(),
      prescribedByName: actorName || undefined,
      prescribedByLogin: actorLogin || undefined,
      items,
      note: generalNote.trim() || undefined,
    };
    await onSave(prescription);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,900px)] max-h-[90dvh] w-[96vw] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-7xl">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2">
            <Pill className="size-5 text-violet-600" />
            Dori belgilash — {patientName}
          </DialogTitle>
          <p className="text-sm font-normal text-slate-500">
            Mahsulotlar katalogi (Dashboard → Mahsulotlar)
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-slate-100 lg:w-1/2 lg:border-b-0 lg:border-r">
            <div className="shrink-0 space-y-4 border-b border-slate-100 bg-slate-50/40 p-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Dori nomi bo‘yicha qidirish…"
                  className="h-10 bg-white pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategory(ALL_TAB)}
                  className={cn(
                    'rounded-lg border px-3.5 py-2 text-xs font-medium shadow-sm transition',
                    category === ALL_TAB ?
                      'border-violet-300 bg-violet-50 text-violet-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/50',
                  )}>
                  Barchasi
                </button>
                {PHARMACY_CATEGORY_DEFS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      'rounded-lg border px-3.5 py-2 text-xs font-medium shadow-sm transition',
                      category === cat.id ?
                        'border-violet-300 bg-violet-50 text-violet-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/50',
                    )}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4">
              {loadingProducts ?
                <p className="py-8 text-center text-sm text-slate-500">Yuklanmoqda…</p>
              : filteredProducts.length === 0 ?
                <p className="py-8 text-center text-sm text-slate-500">Topilmadi</p>
              : <ul className="space-y-2.5">
                  {filteredProducts.slice(0, 80).map((product) => {
                    const added = selected.some((s) => s.productId === product.id);
                    return (
                      <li key={product.id}>
                        <button
                          type="button"
                          disabled={added}
                          onClick={() => addProduct(product)}
                          className={cn(
                            'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition',
                            added ?
                              'cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/60 hover:shadow-sm',
                          )}>
                          <span className="min-w-0">
                            <span className="block font-medium leading-snug">{product.name}</span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {product.group} · {product.unit}
                            </span>
                          </span>
                          {!added ?
                            <span className="flex size-9 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                              <Plus className="size-4" />
                            </span>
                          : <span className="px-2 text-xs font-medium text-emerald-700">Qo‘shildi</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              }
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:w-1/2">
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/40 px-5 py-4">
              <p className="text-sm font-medium text-slate-800">
                Tanlangan dorilar ({selected.length})
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-5">
              {selected.length === 0 ?
                <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
                  Chapdan dori tanlang
                </p>
              : <ul className="space-y-4">
                  {selected.map((item) => (
                    <li
                      key={item.draftKey}
                      className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{item.productName}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{item.unit}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => removeItem(item.draftKey)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Qabul qilish</Label>
                          <Input
                            value={item.dosage ?? ''}
                            onChange={(e) =>
                              updateItem(item.draftKey, { dosage: e.target.value })
                            }
                            placeholder="1 tab. kuniga 2 marta"
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Davomiylik</Label>
                          <Input
                            value={item.duration ?? ''}
                            onChange={(e) =>
                              updateItem(item.draftKey, { duration: e.target.value })
                            }
                            placeholder="7 kun"
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              }
              <div className="mt-5 grid gap-2">
                <Label className="text-xs">Umumiy eslatma (ixtiyoriy)</Label>
                <Textarea
                  value={generalNote}
                  onChange={(e) => setGeneralNote(e.target.value)}
                  rows={2}
                  placeholder="Masalan: ovqatdan keyin ichilsin"
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="relative z-10 shrink-0 gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:justify-end sm:gap-4">
          <Button
            type="button"
            variant="outline"
            className="min-w-[8.5rem] px-5"
            onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            type="button"
            className="min-w-[8.5rem] bg-violet-600 px-5 hover:bg-violet-700"
            disabled={saving || selected.length === 0}
            onClick={() => void handleSave()}>
            {saving ? 'Saqlanmoqda…' : 'Retseptni saqlash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
