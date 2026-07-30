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
import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import {
  JSHSHIR_LENGTH,
  JSHSHIR_VALIDATION_MESSAGE,
  isValidJshshir,
  sanitizeJshshirInput,
} from '@/lib/patients/jshshir';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import { PATIENTS_PER_PAGE, type PatientRow, type PatientSortKey } from '@/lib/patients/types';
import { ArrowLeft, ArrowRight, ArrowUpDown, Ellipsis, Search, X } from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export type PatientsPanelProps = {
  focusPatientId?: string;
  openDiagnosisIntent?: boolean;
};

type SortState = { key: PatientSortKey; direction: 'asc' | 'desc' };

function emptyForm(): PatientRow {
  return {
    id: '',
    fullName: '',
    gender: '',
    birthDate: '',
    diseaseType: '',
    address: '',
    documentType: 'Паспорт Узбекистана',
    documentNumber: '',
    jshshir: '',
    country: '',
    region: '',
    district: '',
    contact: '',
    population: 'Да',
    previousPaidServiceKeys: undefined,
  };
}

function patientSearchHaystack(r: PatientRow): string {
  return [
    r.id,
    r.fullName,
    r.gender,
    r.birthDate,
    r.diseaseType,
    r.address,
    r.documentType,
    r.documentNumber,
    r.jshshir,
    r.country,
    r.region,
    r.district,
    r.contact,
    r.population,
  ]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

function patientMatchesQuery(r: PatientRow, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const hay = patientSearchHaystack(r);
  const hayCompact = hay.replace(/\s+/g, '');
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => {
    const tCompact = t.replace(/\s+/g, '');
    return hay.includes(t) || (tCompact.length > 0 && hayCompact.includes(tCompact));
  });
}

const normalizeStoredRow = normalizePatientRow;

export default function PatientsPanel({
  focusPatientId,
  openDiagnosisIntent,
}: PatientsPanelProps = {}) {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [flashPatientId, setFlashPatientId] = useState<string | null>(null);
  const processedFocusRef = useRef<string | null>(null);
  const diagnosisOpenedRef = useRef<string | null>(null);
  const [sort, setSort] = useState<SortState>({ key: 'id', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [diseaseFilter, setDiseaseFilter] = useState<string>('__all__');
  const [searchQuery, setSearchQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PatientRow>(emptyForm());
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const skipFirstPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const next = await fetchClinicResource<PatientRow[]>('patients');
          const normalized = next.map(normalizeStoredRow).filter((x): x is PatientRow => x !== null);
          startTransition(() => {
            if (cancelled) return;
            setRows(normalized.length ? normalized : []);
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
        await saveClinicResource('patients', rows);
      } catch {
        toast.error('Bemorlar ro‘yxatini serverga saqlab bo‘lmadi');
      }
    })();
  }, [rows, hydrated]);

  useEffect(() => {
    if (!focusPatientId) {
      processedFocusRef.current = null;
      return;
    }
    if (!hydrated) return;
    setSearchQuery(focusPatientId);
    setDiseaseFilter('__all__');
  }, [focusPatientId, hydrated]);

  const diseaseTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const t = r.diseaseType?.trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'uz'));
  }, [rows]);

  const afterDiseaseFilter = useMemo(() => {
    if (diseaseFilter === '__all__') return rows;
    return rows.filter((r) => r.diseaseType === diseaseFilter);
  }, [rows, diseaseFilter]);

  const filtered = useMemo(
    () => afterDiseaseFilter.filter((r) => patientMatchesQuery(r, searchQuery)),
    [afterDiseaseFilter, searchQuery],
  );

  useEffect(() => {
    setPage(1);
  }, [diseaseFilter, searchQuery]);

  const sorted = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const cmp = String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), 'uz', {
        numeric: true,
      });
      return cmp * factor;
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PATIENTS_PER_PAGE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PATIENTS_PER_PAGE;
    return sorted.slice(start, start + PATIENTS_PER_PAGE);
  }, [page, sorted]);

  useEffect(() => {
    if (!hydrated || !focusPatientId) return;
    const idx = sorted.findIndex((r) => r.id === focusPatientId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / PATIENTS_PER_PAGE) + 1;
    setPage(targetPage);
  }, [hydrated, focusPatientId, sorted]);

  useEffect(() => {
    if (!hydrated || !focusPatientId) return;
    if (processedFocusRef.current === focusPatientId) return;
    processedFocusRef.current = focusPatientId;
    setFlashPatientId(focusPatientId);
    const clearFlash = window.setTimeout(() => setFlashPatientId(null), 4200);
    const scroll = window.setTimeout(() => {
      document.querySelector(`[data-patient-row="${focusPatientId}"]`)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth',
      });
    }, 120);
    return () => {
      window.clearTimeout(clearFlash);
      window.clearTimeout(scroll);
    };
  }, [hydrated, focusPatientId]);

  const deleteTarget = useMemo(
    () => rows.find((r) => r.id === deleteId) ?? null,
    [rows, deleteId],
  );

  function changeSort(key: PatientSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }

  const openEdit = useCallback((row: PatientRow) => {
    setEditingId(row.id);
    setFormError('');
    setForm(row);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !focusPatientId || !openDiagnosisIntent) return;
    const key = `${focusPatientId}|tashxis`;
    if (diagnosisOpenedRef.current === key) return;
    const row = rows.find((r) => r.id === focusPatientId);
    if (!row) return;
    diagnosisOpenedRef.current = key;
    const t = window.setTimeout(() => {
      openEdit(row);
    }, 450);
    return () => window.clearTimeout(t);
  }, [hydrated, focusPatientId, openDiagnosisIntent, rows, openEdit]);

  function saveRow() {
    const jshshir = sanitizeJshshirInput(form.jshshir);
    const payload = {
      ...form,
      id: form.id.trim(),
      fullName: form.fullName.trim(),
      diseaseType: form.diseaseType.trim(),
      jshshir,
    };
    if (!payload.id || !payload.fullName) {
      setFormError('ID va F.I.SH majburiy.');
      return;
    }
    if (jshshir && !isValidJshshir(jshshir)) {
      setFormError(JSHSHIR_VALIDATION_MESSAGE);
      return;
    }
    const dup = rows.some((r) => r.id === payload.id && (!editingId || r.id !== editingId));
    if (dup) {
      setFormError('Bu ID allaqachon mavjud.');
      return;
    }
    if (!editingId) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === editingId ?
          {
            ...payload,
            previousPaidServiceKeys: r.previousPaidServiceKeys,
            queueClinicalNote: r.queueClinicalNote,
            orderedLaboratoryKeys: r.orderedLaboratoryKeys,
            laboratoryResults: r.laboratoryResults,
          }
        : r,
      ),
    );
    setDialogOpen(false);
    setEditingId(null);
  }

  function confirmDelete() {
    if (!deleteId) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteId));
    setDeleteId(null);
  }

  function Head({ title, sortKey }: { title: string; sortKey: PatientSortKey }) {
    return (
      <TableHead className="text-xs font-semibold text-slate-600">
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
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur">
      <div className="mb-4 flex flex-col gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="patient-search">Qidiruv</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="patient-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID, F.I.SH, telefon, manzil, hujjat raqami, viloyat, kasallik turi…"
              className="bg-white pl-9 pr-10"
              autoComplete="off"
            />
            {searchQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-500"
                onClick={() => setSearchQuery('')}
                aria-label="Qidiruvni tozalash">
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
          {/* <p className="text-xs text-slate-500">
            Bir nechta so&apos;z kiritsangiz, barchasi mos kelishi kerak (masalan:{" "}
            <span className="font-mono text-slate-600">Buxara 12625</span>).
          </p> */}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-1.5 sm:max-w-md">
            <Label htmlFor="disease-filter">Kasallik turi bo&apos;yicha</Label>
            <Select value={diseaseFilter} onValueChange={setDiseaseFilter}>
              <SelectTrigger
                id="disease-filter"
                className="w-full bg-white"
                title="Kasallik turi filtri">
                <SelectValue placeholder="Barchasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Barcha kasallik turlari</SelectItem>
                {diseaseTypeOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-slate-500">
            Tanlangan filtr: <span className="font-medium text-slate-700">{filtered.length}</span> ta bemor
            {afterDiseaseFilter.length !== rows.length || searchQuery.trim() ? (
              <span className="text-slate-400">
                {" "}
                (kasallik bo&apos;yicha: {afterDiseaseFilter.length})
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="max-h-[68vh] overflow-auto rounded-2xl border border-slate-100">
          <Table>
          <TableHeader className="sticky top-0 z-10 bg-white">
            <TableRow className="border-slate-200/80 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-600">#</TableHead>
              <Head title="F.I.SH" sortKey="fullName" />
              <Head title="Jinsi" sortKey="gender" />
              <Head title="Tug'ilgan sanasi" sortKey="birthDate" />
              <Head title="Kasallik turi" sortKey="diseaseType" />
              <Head title="Manzili" sortKey="address" />
              <Head title="Bog'lanish" sortKey="contact" />
              <TableHead className="text-right text-xs font-semibold text-slate-600">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500">
                  Hech narsa topilmadi. Qidiruv yoki kasallik turini o&apos;zgartirib ko&apos;ring.
                </TableCell>
              </TableRow>
            ) : null}
            {pagedRows.map((row, index) => (
              <TableRow
                key={row.id}
                data-patient-row={row.id}
                className={`border-slate-100 text-sm text-slate-700 transition-shadow ${
                  flashPatientId === row.id ? 'bg-violet-50/90 ring-2 ring-violet-400 ring-offset-2' : ''
                }`}>
                <TableCell className="text-slate-500">{(page - 1) * PATIENTS_PER_PAGE + index + 1}</TableCell>
                <TableCell className="min-w-[220px] font-medium">{row.fullName}</TableCell>
                <TableCell>{row.gender}</TableCell>
                <TableCell>{row.birthDate}</TableCell>
                <TableCell className="max-w-[200px] whitespace-normal">{row.diseaseType || '—'}</TableCell>
                <TableCell>{row.address || '—'}</TableCell>
                <TableCell>{row.contact || '—'}</TableCell>
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
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Jami (bazada): {rows.length} ta. Ko&apos;rsatilmoqda: {filtered.length} ta. Sahifa: {page}/{pageCount}
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            <ArrowLeft className="mr-1 size-4" />
            Oldingi
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount}>
            Keyingi
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bemor ma'lumotini tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="p-id">ID</Label><Input id="p-id" value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-name">F.I.SH</Label><Input id="p-name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-gender">Jinsi</Label><Input id="p-gender" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-birth">Tug'ilgan sanasi</Label><Input id="p-birth" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="p-disease">Kasallik turi</Label><Input id="p-disease" value={form.diseaseType} onChange={(e) => setForm((f) => ({ ...f, diseaseType: e.target.value }))} placeholder="Masalan: Diabet mellitus 2 turi" /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="p-address">Manzil</Label><Input id="p-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-doc-type">Hujjat turi</Label><Input id="p-doc-type" value={form.documentType} onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-doc-num">Hujjat raqami</Label><Input id="p-doc-num" value={form.documentNumber} onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))} /></div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-jshshir">JSHSHIR</Label>
              <Input
                id="p-jshshir"
                inputMode="numeric"
                autoComplete="off"
                maxLength={JSHSHIR_LENGTH}
                value={form.jshshir}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    jshshir: sanitizeJshshirInput(e.target.value),
                  }))
                }
                placeholder="14 ta raqam"
              />
            </div>
            <div className="grid gap-1.5"><Label htmlFor="p-country">Davlat</Label><Input id="p-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-region">Viloyat</Label><Input id="p-region" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-district">Tuman</Label><Input id="p-district" value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-contact">Bog'lanish</Label><Input id="p-contact" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} /></div>
            <div className="grid gap-1.5"><Label htmlFor="p-pop">Aholi</Label><Input id="p-pop" value={form.population} onChange={(e) => setForm((f) => ({ ...f, population: e.target.value }))} /></div>
            {formError ? <p className="text-sm text-red-600 sm:col-span-2">{formError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Bekor qilish</Button>
            <Button type="button" className="bg-violet-600 text-white hover:bg-violet-700" onClick={saveRow}>Saqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bemorni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.fullName} o'chirilsinmi?` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
