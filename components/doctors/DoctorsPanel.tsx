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
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { type DoctorRow, type DoctorSortKey } from '@/lib/doctors/types';
import { generateStaffPassword } from '@/lib/staff-portal/generate-password';
import { UsersStaffDepartmentSelect } from '@/components/users/users-staff-ui';
import { useClinicDepartments } from '@/hooks/useClinicDepartments';
import { cn } from '@/lib/utils';
import {
  ArrowUpDown,
  Building2,
  Ellipsis,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: DoctorSortKey;
  direction: 'asc' | 'desc';
};

type DoctorFormState = DoctorRow & { password: string };

function emptyForm(): DoctorFormState {
  return {
    id: '',
    code: '',
    fullName: '',
    roomNumber: '',
    specialty: '',
    degree: '',
    department: '',
    position: '',
    contact: '',
    status: 'Актив',
    username: '',
    login: '',
    password: generateStaffPassword(),
  };
}

const doctorFieldInputClass =
  'h-11 rounded-xl border-slate-200 bg-slate-50/80 transition focus-visible:border-violet-400 focus-visible:bg-white';

function doctorInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function DoctorSortableHead({
  title,
  sortKey,
  className,
  sort,
  onSort,
}: {
  title: string;
  sortKey: DoctorSortKey;
  className?: string;
  sort: SortState;
  onSort: (key: DoctorSortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <TableHead className={cn('text-xs font-semibold text-slate-500', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1.5 uppercase tracking-wide transition',
          active ? 'text-violet-700' : 'hover:text-slate-900',
        )}>
        {title}
        <ArrowUpDown
          className={cn('size-3.5', active ? 'text-violet-600' : 'opacity-50')}
        />
      </button>
    </TableHead>
  );
}

export default function DoctorsPanel() {
  const { labelFor } = useClinicDepartments();
  const [rows, setRows] = useState<DoctorRow[]>([]);
  const [, setLoading] = useState(true);
  const [sort, setSort] = useState<SortState>({
    key: 'fullName',
    direction: 'asc',
  });
  const [query, setQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DoctorFormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    try {
      const res = await fetch('/api/doctors/staff', { credentials: 'include' });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { items?: DoctorRow[] };
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRows([]);
      toast.error('Shifokorlarni yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      startTransition(() => {
        void (async () => {
          if (cancelled) return;
          await loadRows();
        })();
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const cmp = String(a[sort.key] ?? '').localeCompare(
        String(b[sort.key] ?? ''),
        'uz',
        {
          numeric: true,
        },
      );
      return cmp * factor;
    });
  }, [rows, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((row) =>
      [
        row.fullName,
        row.code,
        row.specialty,
        row.department,
        row.position,
        row.contact,
        row.login,
        row.username,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, sorted]);

  const deleteTarget = useMemo(
    () => rows.find((r) => r.id === deleteId) ?? null,
    [rows, deleteId],
  );

  const summary = useMemo(() => {
    const departments = new Set(
      rows.map((row) => row.department.trim()).filter(Boolean),
    );
    return {
      total: rows.length,
      departments: departments.size,
    };
  }, [rows]);

  function changeSort(key: DoctorSortKey) {
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
    setShowPassword(true);
    setDialogOpen(true);
  }

  function openEdit(row: DoctorRow) {
    setEditingId(row.id);
    setFormError('');
    setForm({ ...row, password: '' });
    setShowPassword(false);
    setDialogOpen(true);
  }

  async function saveRow() {
    const payload = {
      fullName: form.fullName.trim(),
      specialty: form.specialty.trim(),
      department: form.department.trim(),
      contact: form.contact.trim(),
      code: form.code.trim(),
      roomNumber: form.roomNumber.trim(),
      degree: form.degree.trim(),
      position: form.position.trim(),
      login: form.login.trim().toLowerCase(),
      password: form.password.trim() || undefined,
      isActive: !String(form.status).toLowerCase().includes('nofaol'),
    };

    if (!payload.fullName) {
      setFormError('F.I.Sh majburiy.');
      return;
    }
    if (!payload.login) {
      setFormError('Login majburiy.');
      return;
    }
    if (!editingId && !payload.password) {
      setFormError('Yangi shifokor uchun parol kiriting.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const res = await fetch('/api/doctors/staff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = (await res.json()) as { item?: DoctorRow; error?: string };
      if (!res.ok) {
        setFormError(data.error ?? 'Saqlab bo‘lmadi');
        return;
      }
      if (data.item) {
        setRows((prev) =>
          editingId ?
            prev.map((r) => (r.id === editingId ? data.item! : r))
          : [...prev, data.item!],
        );
      } else {
        await loadRows();
      }
      setDialogOpen(false);
      setEditingId(null);
      toast.success(editingId ? 'Shifokor yangilandi' : 'Shifokor qo‘shildi');
    } catch {
      setFormError('Saqlashda xatolik. Qayta urinib ko‘ring.');
      toast.error('Shifokorni saqlab bo‘lmadi');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(
        `/api/doctors/staff?id=${encodeURIComponent(deleteId)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'O‘chirib bo‘lmadi');
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success('Shifokor o‘chirildi');
      setDeleteId(null);
    } catch {
      toast.error('Tarmoq xatoligi');
    }
  }

  return (
    <div className="space-y-6 mt-3">
      <section className="rounded-3xl border border-violet-200/50 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/40 p-6 shadow-xl shadow-violet-200/25 backdrop-blur md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
              <Stethoscope className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">
                Tibbiy xodimlar
              </p>
              <h2 className="mt-1.5 text-2xl font-bold text-slate-900">
                Shifokorlar
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                {summary.total} ta shifokor
                {summary.departments > 0 ?
                  ` · ${summary.departments} ta bo‘lim`
                : ''}
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="rounded-xl bg-violet-600 hover:bg-violet-700"
            onClick={openCreate}>
            <Plus className="size-4" />
            Yangi shifokor
          </Button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur md:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Shifokorlar ro‘yxati
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {filtered.length === rows.length ?
                `${rows.length} ta yozuv`
              : `${filtered.length} ta topildi · jami ${rows.length}`}
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qidirish: ism, bo‘lim, mutaxassislik, login..."
              className="rounded-xl border-slate-200 bg-slate-50/80 pl-10 focus-visible:border-violet-400 focus-visible:bg-white"
            />
          </div>
        </div>

        <div className="max-h-[68vh] overflow-auto rounded-2xl border border-slate-100">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="w-12 text-xs font-semibold text-slate-500">
                  #
                </TableHead>
                <DoctorSortableHead
                  title="F.I.Sh"
                  sortKey="fullName"
                  className="min-w-55"
                  sort={sort}
                  onSort={changeSort}
                />
                <DoctorSortableHead
                  title="Mutaxassislik"
                  sortKey="specialty"
                  sort={sort}
                  onSort={changeSort}
                />
                <DoctorSortableHead
                  title="Bo'lim"
                  sortKey="department"
                  className="min-w-45"
                  sort={sort}
                  onSort={changeSort}
                />
                <DoctorSortableHead
                  title="Login"
                  sortKey="login"
                  sort={sort}
                  onSort={changeSort}
                />
                <TableHead className="w-16 text-right text-xs font-semibold text-slate-500">
                  Amallar
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, index) => (
                <TableRow
                  key={row.id}
                  className="border-slate-100 transition-colors hover:bg-violet-50/40">
                  <TableCell className="font-medium text-slate-400">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-100 to-indigo-100 text-xs font-bold text-violet-700">
                        {doctorInitials(row.fullName)}
                      </span>
                      <span className="font-medium text-slate-800 whitespace-normal">
                        {row.fullName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.specialty ?
                      <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                        {row.specialty}
                      </span>
                    : <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell>
                    {row.department ?
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <Building2 className="size-3.5 shrink-0 text-violet-500" />
                        <span className="whitespace-normal">
                          {labelFor(row.department) || row.department}
                        </span>
                      </span>
                    : <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell>
                    {row.login ?
                      <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                        {row.login}
                      </code>
                    : <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700">
                          <Ellipsis className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem onClick={() => openEdit(row)}>
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600"
                          onClick={() => setDeleteId(row.id)}>
                          O‘chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Stethoscope className="size-7" />
                      </span>
                      <p className="font-medium text-slate-700">
                        Shifokor topilmadi
                      </p>
                      <p className="text-sm text-slate-500">
                        Qidiruv so‘zini o‘zgartiring yoki yangi shifokor
                        qo‘shing.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-1 rounded-xl bg-violet-600 hover:bg-violet-700"
                        onClick={openCreate}>
                        <Plus className="size-4" />
                        Yangi shifokor
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[520px]">
          <div className="relative max-h-[min(90vh,680px)] overflow-hidden rounded-3xl border border-violet-200/60 bg-white shadow-2xl shadow-violet-900/10">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-violet-500/20 via-indigo-500/8 to-transparent" />
            <div className="relative max-h-[min(90vh,680px)] overflow-y-auto p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/35">
                  <Stethoscope className="size-7" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                    {editingId ? 'Shifokorni tahrirlash' : 'Yangi shifokor'}
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {editingId ?
                      'Shifokor ma’lumotlari va tizimga kirish loginini yangilang.'
                    : 'Shifokor profili va portal kirish ma’lumotlarini bir joyda kiriting.'}
                  </DialogDescription>
                </div>
              </div>

              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <UserRound className="size-3.5 text-violet-600" />
                    Shaxsiy ma’lumotlar
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label
                        htmlFor="d-full"
                        className="flex items-center gap-2 text-slate-700">
                        <UserRound className="size-4 text-violet-600" />
                        F.I.Sh
                      </Label>
                      <Input
                        id="d-full"
                        className={doctorFieldInputClass}
                        placeholder="Masalan: Karimov Dilshod Olim o‘g‘li"
                        value={form.fullName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, fullName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="d-special"
                        className="flex items-center gap-2 text-slate-700">
                        <Stethoscope className="size-4 text-violet-600" />
                        Mutaxassislik
                      </Label>
                      <Input
                        id="d-special"
                        className={doctorFieldInputClass}
                        placeholder="Endokrinolog"
                        value={form.specialty}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, specialty: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-slate-700">
                        <Building2 className="size-4 text-violet-600" />
                        Bo&apos;lim
                      </Label>
                      <UsersStaffDepartmentSelect
                        value={form.department}
                        className={doctorFieldInputClass}
                        onChange={(department) =>
                          setForm((f) => ({ ...f, department }))
                        }
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-violet-100 bg-violet-50/35 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700/80">
                    <KeyRound className="size-3.5 text-violet-600" />
                    Tizimga kirish
                  </p>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="d-login"
                        className="flex items-center gap-2 text-slate-700">
                        <UserRound className="size-4 text-violet-600" />
                        Login
                      </Label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="d-login"
                          autoComplete="username"
                          className={cn(
                            doctorFieldInputClass,
                            'pl-10 font-mono',
                          )}
                          placeholder="masalan: d.karimov"
                          value={form.login}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              login: e.target.value
                                .toLowerCase()
                                .replace(/\s/g, ''),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="d-password"
                        className="flex items-center gap-2 text-slate-700">
                        <Lock className="size-4 text-violet-600" />
                        {editingId ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            id="d-password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            className={cn(
                              doctorFieldInputClass,
                              'pl-10 pr-11 font-mono',
                            )}
                            placeholder={
                              editingId ?
                                'O‘zgartirmaslik uchun bo‘sh qoldiring'
                              : 'Kamida 6 belgi'
                            }
                            value={form.password}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                password: e.target.value,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
                            title={
                              showPassword ?
                                'Parolni yashirish'
                              : 'Parolni ko‘rsatish'
                            }
                            onClick={() => setShowPassword((value) => !value)}>
                            {showPassword ?
                              <EyeOff className="size-4" />
                            : <Eye className="size-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 shrink-0 rounded-xl border-violet-200 bg-white px-3 text-violet-700 hover:bg-violet-50"
                          title="Parol yaratish"
                          onClick={() => {
                            setShowPassword(true);
                            setForm((f) => ({
                              ...f,
                              password: generateStaffPassword(),
                            }));
                          }}>
                          <Sparkles className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                {!editingId ?
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-900">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <p>
                      Saqlangandan so‘ng shifokor{' '}
                      <span className="font-medium">/doctor</span> kabinetiga
                      login va parol bilan kira oladi.
                    </p>
                  </div>
                : null}

                {formError ?
                  <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                    {formError}
                  </p>
                : null}
              </div>

              <DialogFooter className="mt-8 flex-col gap-2 border-t border-slate-100/80 pt-6 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-slate-200"
                  disabled={saving}
                  onClick={() => setDialogOpen(false)}>
                  Bekor qilish
                </Button>
                <Button
                  type="button"
                  className="rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 hover:from-violet-700 hover:to-indigo-700"
                  disabled={saving}
                  onClick={() => void saveRow()}>
                  {saving ?
                    'Saqlanmoqda…'
                  : editingId ?
                    'O‘zgarishlarni saqlash'
                  : 'Shifokor qo‘shish'}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shifokorni o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `${deleteTarget.fullName} o&apos;chirilsinmi?`
              : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void confirmDelete()}>
              O&apos;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
