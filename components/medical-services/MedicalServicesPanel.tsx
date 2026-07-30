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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import { type MedicalService, type MedicalServiceSortKey } from '@/lib/medical-services/types';
import { ArrowUpDown, Check, Ellipsis, Plus, X } from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: MedicalServiceSortKey;
  direction: 'asc' | 'desc';
};

type FormState = MedicalService;

function emptyForm(): FormState {
  return {
    id: '',
    code: '',
    name: '',
    roomNumber: '',
    doctorLevel: '',
    medicalServiceGroup: '',
    medicalServicesGroup: 'Медицинские услуги',
    status: 'Актив',
  };
}

function isActiveStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  return normalized === 'active' || normalized === 'aktiv' || normalized === 'актив';
}

export default function MedicalServicesPanel() {
  const [rows, setRows] = useState<MedicalService[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: 'id', direction: 'asc' });
  const [query, setQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const statusActive = isActiveStatus(form.status);
  const skipFirstPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const next = await fetchClinicResource<MedicalService[]>('medical-services');
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
        await saveClinicResource('medical-services', rows);
      } catch {
        toast.error('Tibbiy xizmatlarni saqlab bo‘lmadi');
      }
    })();
  }, [rows, hydrated]);

  const sorted = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const cmp = String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), 'uz', {
        numeric: true,
      });
      return cmp * factor;
    });
  }, [rows, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((row) =>
      [row.code, row.name, row.roomNumber, row.doctorLevel, row.medicalServiceGroup, row.medicalServicesGroup, row.status]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, sorted]);

  const deleteTarget = useMemo(
    () => rows.find((r) => r.id === deleteId) ?? null,
    [rows, deleteId],
  );

  function changeSort(key: MedicalServiceSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }

  function openCreate() {
    setEditingId(null);
    setFormError('');
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(row: MedicalService) {
    setEditingId(row.id);
    setFormError('');
    setForm(row);
    setDialogOpen(true);
  }

  function saveRow() {
    const payload: MedicalService = {
      id: form.id.trim(),
      code: form.code.trim(),
      name: form.name.trim(),
      roomNumber: form.roomNumber.trim(),
      doctorLevel: form.doctorLevel.trim(),
      medicalServiceGroup: form.medicalServiceGroup.trim(),
      medicalServicesGroup: form.medicalServicesGroup.trim(),
      status: form.status.trim() || 'Актив',
    };

    if (!payload.id || !payload.name) {
      setFormError('ID va Nomi majburiy.');
      return;
    }

    const dup = rows.some((r) => r.id === payload.id && (!editingId || r.id !== editingId));
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

  function Head({
    title,
    sortKey,
    className = '',
  }: {
    title: string;
    sortKey: MedicalServiceSortKey;
    className?: string;
  }) {
    return (
      <TableHead className={`text-xs font-semibold text-slate-600 ${className}`}>
        <button
          type="button"
          onClick={() => changeSort(sortKey)}
          className="inline-flex items-center gap-1 hover:text-slate-900">
          {title}
          <ArrowUpDown className="size-3.5" />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
          onClick={openCreate}>
          <Plus className="size-4" />
          Yangi xizmat
        </Button>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/80 shadow-lg backdrop-blur">
        <div className="p-3 pb-0">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Qidirish: nomi, kod, guruh, holat..."
            className="max-w-md bg-white"
          />
        </div>
        <div className="max-h-[68vh] overflow-auto rounded-b-2xl">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="border-slate-200/80 hover:bg-transparent">
              <TableHead className="w-12 text-xs font-semibold text-slate-600">#</TableHead>
              <Head title="Kod" sortKey="code" />
              <Head title="Nomi" sortKey="name" className="min-w-[260px]" />
              <Head title="Xona raqami" sortKey="roomNumber" />
              <Head title="Shifokorlik darajasi" sortKey="doctorLevel" className="min-w-[180px]" />
              <Head title="Tibbiy xizmat guruhi" sortKey="medicalServiceGroup" className="min-w-[180px]" />
              <Head title="Tibbiy xizmatlar guruhi" sortKey="medicalServicesGroup" className="min-w-[180px]" />
              <Head title="Holati" sortKey="status" />
              <TableHead className="w-12 text-center text-xs font-semibold text-slate-600" />
              <TableHead className="text-right text-xs font-semibold text-slate-600">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-slate-500">
                  Hozircha yozuv yo&apos;q.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row, index) => (
                <TableRow key={`${row.id}-${row.code}-${row.name}`} className="border-slate-100 text-sm text-slate-700">
                  <TableCell className="text-slate-500">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.roomNumber || '—'}</TableCell>
                  <TableCell>{row.doctorLevel || '—'}</TableCell>
                  <TableCell>{row.medicalServiceGroup || '—'}</TableCell>
                  <TableCell>{row.medicalServicesGroup || '—'}</TableCell>
                  <TableCell>{row.status || '—'}</TableCell>
                  <TableCell className="text-center">
                    {isActiveStatus(row.status) ? (
                      <Check className="mx-auto size-4 text-emerald-600" />
                    ) : (
                      <X className="mx-auto size-4 text-amber-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-xs" aria-label="Amallar">
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(row)}>Tahrirlash</DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600" onClick={() => setDeleteId(row.id)}>
                          O&apos;chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Xizmatni tahrirlash" : "Yangi tibbiy xizmat"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ms-id">ID</Label>
              <Input id="ms-id" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ms-code">Kod</Label>
              <Input id="ms-code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="ms-name">Nomi</Label>
              <Input id="ms-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ms-room">Xona raqami</Label>
              <Input id="ms-room" value={form.roomNumber} onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ms-level">Shifokorlik darajasi</Label>
              <Input id="ms-level" value={form.doctorLevel} onChange={(e) => setForm((f) => ({ ...f, doctorLevel: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ms-group">Tibbiy xizmat guruhi</Label>
              <Input id="ms-group" value={form.medicalServiceGroup} onChange={(e) => setForm((f) => ({ ...f, medicalServiceGroup: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ms-g2">Tibbiy xizmatlar guruhi</Label>
              <Input id="ms-g2" value={form.medicalServicesGroup} onChange={(e) => setForm((f) => ({ ...f, medicalServicesGroup: e.target.value }))} />
            </div>
            <div
              className={`grid gap-1.5 rounded-lg border p-3 transition-colors sm:col-span-2 ${
                statusActive
                  ? 'border-emerald-300 bg-emerald-100/70 text-emerald-900'
                  : 'border-rose-300 bg-rose-100/70 text-rose-900'
              }`}>
              <Label htmlFor="ms-status">Holati</Label>
              <Input
                id="ms-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className={
                  statusActive
                    ? 'border-emerald-300 bg-white/90'
                    : 'border-rose-300 bg-white/90'
                }
              />
              <p className="text-xs">
                {statusActive ? 'Holat: Aktiv' : 'Holat: Noaktiv'}
              </p>
            </div>
            {formError ? <p className="text-sm text-red-600 sm:col-span-2">{formError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="button" className="bg-violet-600 text-white hover:bg-violet-700" onClick={saveRow}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xizmatni o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `“${deleteTarget.name}” (ID: ${deleteTarget.id}) o&apos;chirilsinmi?` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>
              O&apos;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
