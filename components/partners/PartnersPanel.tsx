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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import { type Partner, type PartnerSortKey } from '@/lib/partners/types';
import { ArrowUpDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: PartnerSortKey;
  direction: 'asc' | 'desc';
};

type FormState = Partner;

function emptyForm(): FormState {
  return {
    id: '',
    name: '',
    stir: '',
    contact: '',
    status: 'Актив',
  };
}

function rowSearchHaystack(r: Partner): string {
  return [r.id, r.name, r.stir, r.contact, r.status]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

export default function PartnersPanel() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState>({ key: 'id', direction: 'asc' });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const skipFirstPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const next = await fetchClinicResource<Partner[]>('partners');
          startTransition(() => {
            if (cancelled) return;
            setRows(Array.isArray(next) ? next : []);
            setHydrated(true);
          });
        } catch {
          startTransition(() => {
            if (cancelled) return;
            setRows([]);
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
        await saveClinicResource('partners', rows);
      } catch {
        toast.error('Hamkorlarni saqlab bo‘lmadi');
      }
    })();
  }, [rows, hydrated]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => rowSearchHaystack(r).includes(q));
  }, [rows, searchQuery]);

  const sorted = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const cmp = String(a[sort.key] ?? '').localeCompare(
        String(b[sort.key] ?? ''),
        'uz',
        {
          numeric: true,
        },
      );
      return cmp * factor;
    });
  }, [filtered, sort]);

  const deleteTarget = useMemo(
    () => rows.find((r) => r.id === deleteId) ?? null,
    [rows, deleteId],
  );

  function changeSort(key: PartnerSortKey) {
    setSort((prev) =>
      prev.key === key ?
        { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' },
    );
  }

  function openCreate() {
    setEditingId(null);
    setFormError('');
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(row: Partner) {
    setEditingId(row.id);
    setFormError('');
    setForm(row);
    setDialogOpen(true);
  }

  function nextPartnerId(existing: Partner[]): string {
    const nums = existing
      .map((r) => Number.parseInt(r.id.replace(/\D/g, ''), 10))
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1);
  }

  function saveRow() {
    const name = form.name.trim();
    if (!name) {
      setFormError('Nom majburiy.');
      return;
    }

    const id =
      editingId ?
        editingId
      : form.id.trim() || nextPartnerId(rows);

    const payload: Partner = {
      id,
      name,
      stir: form.stir.trim(),
      contact: form.contact.trim(),
      status: form.status.trim() || 'Актив',
    };

    const dup = rows.some(
      (r) => r.id === payload.id && (!editingId || r.id !== editingId),
    );
    if (dup) {
      setFormError('Bu ID allaqachon mavjud.');
      return;
    }

    if (editingId) {
      setRows((prev) => prev.map((r) => (r.id === editingId ? payload : r)));
    } else {
      setRows((prev) => [...prev, payload]);
    }

    setDialogOpen(false);
    setEditingId(null);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  return (
    <div className="space-y-5 mt-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md min-w-0 sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qidirish: nomi, STIR, bog‘lanish, holat, ID…"
            className="h-10 rounded-xl border-violet-200/80 bg-white pl-9 shadow-sm"
            aria-label="Hamkorlar bo‘yicha qidiruv"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
          onClick={openCreate}>
          <Plus className="size-4" />
          Yangi hamkor
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-lg backdrop-blur">
        <div className="max-h-[calc(100dvh-18rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/90">
              <TableRow className="border-slate-200/80 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => changeSort('id')}
                    className="inline-flex items-center gap-1 hover:text-slate-900">
                    ID <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[280px] text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => changeSort('name')}
                    className="inline-flex items-center gap-1 hover:text-slate-900">
                    Nomi <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => changeSort('stir')}
                    className="inline-flex items-center gap-1 hover:text-slate-900">
                    STIR <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead className="min-w-[200px] text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => changeSort('contact')}
                    className="inline-flex items-center gap-1 hover:text-slate-900">
                    Bog&apos;lanish <ArrowUpDown className="size-3.5" />
                  </button>
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600">
                  Amallar
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ?
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-slate-500">
                    Hozircha yozuv yo&apos;q.
                  </TableCell>
                </TableRow>
              : sorted.length === 0 ?
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-slate-500">
                    Qidiruv bo‘yicha natija yo‘q.
                  </TableCell>
                </TableRow>
              : sorted.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-slate-100 text-sm text-slate-700">
                    <TableCell className="font-mono text-xs">
                      {row.id}
                    </TableCell>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.stir || '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.contact || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                          onClick={() => openEdit(row)}
                          aria-label="Tahrirlash">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteId(row.id)}
                          aria-label="O'chirish">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Hamkorni tahrirlash' : 'Yangi hamkor'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="p-name">Nomi</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="p-stir">INN</Label>
              <Input
                id="p-stir"
                value={form.stir}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stir: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="p-contact">Bog&apos;lanish</Label>
              <Input
                id="p-contact"
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
              />
            </div>

            {formError ?
              <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>
            : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={saveRow}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hamkorni o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `“${deleteTarget.name}” (ID: ${deleteTarget.id}) o&apos;chirilsinmi?`
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
