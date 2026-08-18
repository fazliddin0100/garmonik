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
import { type ContractRow, type ContractSortKey } from '@/lib/contracts/types';
import { ArrowUpDown, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: ContractSortKey;
  direction: 'asc' | 'desc';
};

type FormState = ContractRow;

function emptyForm(): FormState {
  return {
    id: '',
    accountNumber: '',
    supplierName: '',
    orderNo: '',
    contact: '',
    date: '',
    endDate: '',
    amount: '',
    note: '',
    status: 'Актив',
  };
}

function rowSearchHaystack(r: ContractRow): string {
  return [
    r.id,
    r.accountNumber,
    r.supplierName,
    r.orderNo,
    r.contact,
    r.date,
    r.endDate,
    r.amount,
    r.note,
    r.status,
  ]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

function Head({
  title,
  sortKey,
  className = '',
  onSort,
}: {
  title: string;
  sortKey: ContractSortKey;
  className?: string;
  onSort: (key: ContractSortKey) => void;
}) {
  return (
    <TableHead className={`text-xs font-semibold text-slate-600 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-900">
        {title}
        <ArrowUpDown className="size-3.5" />
      </button>
    </TableHead>
  );
}

export default function ContractsPanel() {
  const [rows, setRows] = useState<ContractRow[]>([]);
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
          const next = await fetchClinicResource<ContractRow[]>('contracts');
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
        await saveClinicResource('contracts', rows);
      } catch {
        toast.error('Shartnomalarni saqlab bo‘lmadi');
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

  function changeSort(key: ContractSortKey) {
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

  function openEdit(row: ContractRow) {
    setEditingId(row.id);
    setFormError('');
    setForm(row);
    setDialogOpen(true);
  }

  function nextContractId(existing: ContractRow[]): string {
    const nums = existing
      .map((r) => Number.parseInt(r.id.replace(/\D/g, ''), 10))
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1);
  }

  function nextOrderNo(existing: ContractRow[]): string {
    const nums = existing
      .map((r) => Number.parseInt(String(r.orderNo).replace(/\D/g, ''), 10))
      .filter((n) => Number.isFinite(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1);
  }

  function saveRow() {
    const supplierName = form.supplierName.trim();
    if (!supplierName) {
      setFormError('Shartnomachi nomi majburiy.');
      return;
    }

    const id =
      editingId ?
        editingId
      : form.id.trim() || nextContractId(rows);

    const payload: ContractRow = {
      ...form,
      id,
      accountNumber: form.accountNumber.trim(),
      supplierName,
      orderNo:
        editingId ?
          form.orderNo.trim()
        : form.orderNo.trim() || nextOrderNo(rows),
      contact: form.contact.trim(),
      date: form.date.trim(),
      endDate: form.endDate.trim(),
      amount: form.amount.trim(),
      note: form.note.trim(),
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
            placeholder="Qidirish: hisob raqam, yetkazib beruvchi, T/r, bog‘lanish, sana…"
            className="h-10 rounded-xl border-violet-200/80 bg-white pl-9 shadow-sm"
            aria-label="Shartnomalar bo‘yicha qidiruv"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
          onClick={openCreate}>
          <Plus className="size-4" />
          Yangi shartnoma
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-lg backdrop-blur">
        <div className="max-h-[calc(100dvh-18rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/90">
              <TableRow className="border-slate-200/80 hover:bg-transparent">
                <Head title="ID" sortKey="id" onSort={changeSort} />
                <Head
                  title="Hisob raqam (L/S)"
                  sortKey="accountNumber"
                  className="min-w-55"
                  onSort={changeSort}
                />
                <Head
                  title="Shartnomachi nomi"
                  sortKey="supplierName"
                  className="min-w-70"
                  onSort={changeSort}
                />
                <Head title="T/r" sortKey="orderNo" onSort={changeSort} />
                <Head
                  title="Bog'lanish"
                  sortKey="contact"
                  className="min-w-55"
                  onSort={changeSort}
                />
                <Head title="Sana" sortKey="date" onSort={changeSort} />
                <Head
                  title="Tugash sanasi"
                  sortKey="endDate"
                  onSort={changeSort}
                />
                <Head title="Summa" sortKey="amount" onSort={changeSort} />
                <Head title="Izoh" sortKey="note" onSort={changeSort} />
                <TableHead className="text-right text-xs font-semibold text-slate-600">
                  Amallar
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ?
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-sm text-slate-500">
                    Hozircha yozuv yo&apos;q.
                  </TableCell>
                </TableRow>
              : sorted.length === 0 ?
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="py-10 text-center text-sm text-slate-500">
                    Qidiruv bo‘yicha natija yo‘q.
                  </TableCell>
                </TableRow>
              : sorted.map((row) => (
                  <TableRow
                    key={`${row.id}-${row.orderNo}`}
                    className="border-slate-100 text-sm text-slate-700">
                    <TableCell className="font-mono text-xs">
                      {row.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.accountNumber || '—'}
                    </TableCell>
                    <TableCell className="font-medium whitespace-normal">
                      {row.supplierName || '—'}
                    </TableCell>
                    <TableCell>{row.orderNo || '—'}</TableCell>
                    <TableCell className="whitespace-normal">
                      {row.contact || '—'}
                    </TableCell>
                    <TableCell>{row.date || '—'}</TableCell>
                    <TableCell>{row.endDate || '—'}</TableCell>
                    <TableCell>{row.amount || '—'}</TableCell>
                    <TableCell>{row.note || '—'}</TableCell>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Shartnomani tahrirlash' : 'Yangi shartnoma'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="c-supplier">Shartnomachi nomi</Label>
              <Input
                id="c-supplier"
                value={form.supplierName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplierName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-account">Hisob raqam (L/S)</Label>
              <Input
                id="c-account"
                value={form.accountNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountNumber: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-contact">Bog&apos;lanish</Label>
              <Input
                id="c-contact"
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-date">Sana</Label>
              <Input
                id="c-date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                placeholder="01.12.2024"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-end-date">Tugash sanasi</Label>
              <Input
                id="c-end-date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                placeholder="31.12.2024"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-amount">Summa</Label>
              <Input
                id="c-amount"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-note">Izoh</Label>
              <Input
                id="c-note"
                value={form.note}
                onChange={(e) =>
                  setForm((f) => ({ ...f, note: e.target.value }))
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
            <AlertDialogTitle>Shartnomani o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `ID ${deleteTarget.id} yozuvi o&apos;chirilsinmi?`
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
