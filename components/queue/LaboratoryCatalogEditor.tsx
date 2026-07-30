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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LabCategory, LabTestItem } from '@/lib/laboratory/catalog-types';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type LaboratoryCatalogEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: LabCategory[];
  onSave: (next: LabCategory[]) => void;
};

export default function LaboratoryCatalogEditor({
  open,
  onOpenChange,
  catalog,
  onSave,
}: LaboratoryCatalogEditorProps) {
  const [draft, setDraft] = useState<LabCategory[]>(catalog);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  /** Faqat oyna ochilganda (false→true) katalog nusxalanadi — ochiq paytda `catalog` prop o‘zgarsa draft buzilmaydi */
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const snap = catalog.map((c) => ({
        ...c,
        items: c.items.map((i) => ({ ...i })),
      }));
      queueMicrotask(() => {
        setDraft(snap);
      });
    }
    wasOpenRef.current = open;
  }, [open, catalog]);

  function updateCategory(id: string, patch: Partial<LabCategory>) {
    setDraft((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeCategory(id: string) {
    setDraft((prev) => prev.filter((c) => c.id !== id));
    setDeleteCategoryId(null);
  }

  function addCategory() {
    setDraft((prev) => [
      ...prev,
      { id: newId('tur'), title: 'Yangi turkum', items: [] },
    ]);
  }

  function updateItem(
    catId: string,
    itemId: string,
    patch: Partial<LabTestItem>,
  ) {
    setDraft((prev) =>
      prev.map((c) =>
        c.id !== catId ?
          c
        : {
            ...c,
            items: c.items.map((it) =>
              it.id === itemId ? { ...it, ...patch } : it,
            ),
          },
      ),
    );
  }

  function addItem(catId: string) {
    setDraft((prev) =>
      prev.map((c) =>
        c.id !== catId ?
          c
        : {
            ...c,
            items: [
              ...c.items,
              { id: newId('tahlil'), name: 'Yangi tahlil', norm: '', unit: '' },
            ],
          },
      ),
    );
  }

  function removeItem(catId: string, itemId: string) {
    setDraft((prev) =>
      prev.map((c) =>
        c.id !== catId ?
          c
        : { ...c, items: c.items.filter((it) => it.id !== itemId) },
      ),
    );
  }

  function handleSave() {
    const cleaned = draft
      .map((c) => ({
        ...c,
        id: c.id.trim(),
        title: c.title.trim() || 'Turkumsiz',
        items: c.items
          .map((it) => ({
            ...it,
            id: it.id.trim(),
            name: it.name.trim() || 'Tahlil',
            norm: it.norm?.trim() || undefined,
            unit: it.unit?.trim() || undefined,
            code: it.code?.trim() || undefined,
          }))
          .filter((it) => it.id && it.name),
      }))
      .filter((c) => c.id && c.title);
    onSave(cleaned);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!flex max-h-[min(90vh,720px)] w-[calc(100vw-2rem)] max-w-[min(1280px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-5xl lg:max-w-6xl">
          <DialogHeader className="shrink-0 border-b border-slate-200/80 px-4 py-4 sm:px-6">
            <DialogTitle>Laboratoriya katalogi</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Turkumlar va ularning ichidagi tahlillarni qo‘shing, tahrirlang
              yoki o‘chiring. O‘zgarishlar brauzer xotirasida saqlanadi.
            </p>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-8 sm:px-6 sm:py-5 sm:pb-10">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={addCategory}>
                  <Plus className="size-4" />
                  Yangi turkum
                </Button>
              </div>

              {draft.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid min-w-0 flex-1 gap-2 sm:max-w-xl">
                      <Label htmlFor={`cat-title-${cat.id}`}>
                        Turkum {idx + 1}
                      </Label>
                      <Input
                        id={`cat-title-${cat.id}`}
                        value={cat.title}
                        onChange={(e) =>
                          updateCategory(cat.id, { title: e.target.value })
                        }
                        className="bg-white"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteCategoryId(cat.id)}
                      aria-label="Turkumni o‘chirish">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">ID: {cat.id}</p>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        Tahlillar
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs"
                        onClick={() => addItem(cat.id)}>
                        <Plus className="size-3.5" />
                        Qator qo‘shish
                      </Button>
                    </div>
                    {cat.items.length === 0 ?
                      <p className="text-sm text-slate-500">
                        Hozircha tahlil yo‘q.
                      </p>
                    : null}
                    {cat.items.map((it) => (
                      <div
                        key={it.id}
                        className="grid gap-2 rounded-xl border border-white bg-white/90 p-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="grid gap-1 sm:col-span-2">
                          <Label className="text-xs">Nomi</Label>
                          <Input
                            value={it.name}
                            onChange={(e) =>
                              updateItem(cat.id, it.id, {
                                name: e.target.value,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Kod</Label>
                          <Input
                            value={it.code ?? ''}
                            onChange={(e) =>
                              updateItem(cat.id, it.id, {
                                code: e.target.value,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Me’yor</Label>
                          <Input
                            value={it.norm ?? ''}
                            onChange={(e) =>
                              updateItem(cat.id, it.id, {
                                norm: e.target.value,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Birlik</Label>
                          <Input
                            value={it.unit ?? ''}
                            onChange={(e) =>
                              updateItem(cat.id, it.id, {
                                unit: e.target.value,
                              })
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="flex items-end sm:col-span-2 lg:col-span-4">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => removeItem(cat.id, it.id)}>
                            Qatorni o‘chirish
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-auto flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200/80 bg-slate-50/95 px-4 py-4 pb-5 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={handleSave}>
              Katalogni saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteCategoryId}
        onOpenChange={(o) => !o && setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turkumni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Bu turkumdagi barcha tahlillar ham o‘chiriladi. Davom etasizmi?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() =>
                deleteCategoryId && removeCategory(deleteCategoryId)
              }>
              O‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
