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
import {
  type MedicalServiceGroup,
  type MedicalServiceGroupSortKey,
} from '@/lib/service-groups/types';
import { ArrowUpDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: MedicalServiceGroupSortKey;
  direction: 'asc' | 'desc';
};

type FormState = {
  name: string;
  status: string;
};

function emptyForm(): FormState {
  return { name: '', status: 'Актив' };
}

function isActiveStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return (
    normalized === 'active' || normalized === 'aktiv' || normalized === 'актив'
  );
}

function rowSearchHaystack(r: MedicalServiceGroup): string {
  return [r.id, r.code, r.name, r.status]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

export default function MedicalServiceGroupsPanel() {
  const [rows, setRows] = useState<MedicalServiceGroup[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState>({
    key: 'name',
    direction: 'asc',
  });

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
          const next = await fetchClinicResource<MedicalServiceGroup[]>(
            'medical-service-groups',
          );
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
        await saveClinicResource('medical-service-groups', rows);
      } catch {
        toast.error('Guruhlarni saqlab bo‘lmadi');
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
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      const cmp = String(av).localeCompare(String(bv), 'uz', { numeric: true });
      return cmp * factor;
    });
  }, [filtered, sort]);

  const deleteTarget = useMemo(
    () => rows.find((r) => r.id === deleteId) ?? null,
    [rows, deleteId],
  );
  const statusActive = isActiveStatus(form.status);

  function changeSort(key: MedicalServiceGroupSortKey) {
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

  function openEdit(row: MedicalServiceGroup) {
    setEditingId(row.id);
    setFormError('');
    setForm({
      name: row.name,
      status: row.status,
    });
    setDialogOpen(true);
  }

  function saveRow() {
    const name = form.name.trim();
    const status = form.status.trim() || 'Актив';

    if (!name) {
      setFormError('Nom majburiy.');
      return;
    }

    if (editingId) {
      const prev = rows.find((r) => r.id === editingId);
      if (!prev) {
        setFormError('Yozuv topilmadi.');
        return;
      }
      const payload: MedicalServiceGroup = { ...prev, name, status };
      setRows((rowsPrev) =>
        rowsPrev.map((r) => (r.id === editingId ? payload : r)),
      );
    } else {
      const id = `msg-${crypto.randomUUID()}`;
      const payload: MedicalServiceGroup = { id, code: '', name, status };
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
    <div className="mt-3 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md min-w-0 sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qidirish: nom, holat, ichki ID yoki kod…"
            className="h-10 rounded-xl border-violet-200/80 bg-white pl-9 shadow-sm"
            aria-label="Tibbiy xizmat guruhlari bo‘yicha qidiruv"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
          onClick={openCreate}>
          <Plus className="size-4" />
          Yangi guruh
        </Button>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/75 shadow-lg backdrop-blur">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200/80 hover:bg-transparent">
              <TableHead className="min-w-55 text-xs font-semibold text-slate-600">
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
                  onClick={() => changeSort('status')}
                  className="inline-flex items-center gap-1 hover:text-slate-900">
                  Holati <ArrowUpDown className="size-3.5" />
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
                  colSpan={3}
                  className="py-10 text-center text-sm text-slate-500">
                  Hozircha yozuv yo&apos;q.
                </TableCell>
              </TableRow>
            : sorted.length === 0 ?
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-slate-500">
                  Qidiruv bo‘yicha natija yo‘q.
                </TableCell>
              </TableRow>
            : sorted.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-slate-100 text-sm text-slate-700">
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-xs">{row.status}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Guruhni tahrirlash' : 'Yangi tibbiy xizmat guruhi'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="msg-name">Nomi</Label>
              <Input
                id="msg-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div
              className={`grid gap-1.5 rounded-lg border p-3 transition-colors ${
                statusActive ?
                  'border-emerald-300 bg-emerald-100/70 text-emerald-900'
                : 'border-rose-300 bg-rose-100/70 text-rose-900'
              }`}>
              <Label htmlFor="msg-status">Holati</Label>
              <Input
                id="msg-status"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
                className={
                  statusActive ?
                    'border-emerald-300 bg-white/90'
                  : 'border-rose-300 bg-white/90'
                }
              />
              <p className="text-xs">
                {statusActive ? 'Holat: Aktiv' : 'Holat: Noaktiv'}
              </p>
            </div>
            {formError ?
              <p className="text-sm text-red-600">{formError}</p>
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
            <AlertDialogTitle>Guruhni o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `“${deleteTarget.name}” o‘chirilsinmi?` : ''}
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
