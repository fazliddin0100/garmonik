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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  USERS_STAFF_FIELD_CLASS,
  UsersSortableHead,
  UsersStaffActionsCell,
  UsersStaffDepartmentCell,
  UsersStaffDepartmentSelect,
  UsersStaffEmptyRow,
  UsersStaffFieldLabel,
  UsersStaffFormDialog,
  UsersStaffFormSection,
  UsersStaffHero,
  UsersStaffLoginCode,
  UsersStaffNameCell,
  UsersStaffPasswordField,
  UsersStaffPortalHint,
  UsersStaffSpecialtyBadge,
  UsersStaffTableSection,
} from '@/components/users/users-staff-ui';
import {
  type LaboratoryStaffRow,
  type LaboratoryStaffSortKey,
} from '@/lib/laboratory-staff/types';
import { generateStaffPassword } from '@/lib/staff-portal/generate-password';
import { cn } from '@/lib/utils';
import { Building2, KeyRound, Microscope, UserRound } from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: LaboratoryStaffSortKey;
  direction: 'asc' | 'desc';
};

type StaffForm = {
  fullName: string;
  specialty: string;
  department: string;
  login: string;
  password: string;
};

function emptyForm(): StaffForm {
  return {
    fullName: '',
    specialty: '',
    department: '',
    login: '',
    password: generateStaffPassword(),
  };
}

export default function LaboratoryStaffPanel() {
  const [rows, setRows] = useState<LaboratoryStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: 'fullName', direction: 'asc' });
  const [query, setQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    try {
      const res = await fetch('/api/laboratory/staff', { credentials: 'include' });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { items?: LaboratoryStaffRow[] };
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRows([]);
      toast.error('Laboratoriya xodimlarini yuklab bo‘lmadi');
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
        { numeric: true },
      );
      return cmp * factor;
    });
  }, [rows, sort]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((row) =>
      [row.fullName, row.specialty, row.department, row.login]
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

  function changeSort(key: LaboratoryStaffSortKey) {
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

  function openEdit(row: LaboratoryStaffRow) {
    setEditingId(row.id);
    setFormError('');
    setForm({
      fullName: row.fullName,
      specialty: row.specialty,
      department: row.department,
      login: row.login,
      password: '',
    });
    setShowPassword(false);
    setDialogOpen(true);
  }

  async function saveRow() {
    const payload = {
      fullName: form.fullName.trim(),
      specialty: form.specialty.trim(),
      department: form.department.trim(),
      login: form.login.trim().toLowerCase(),
      password: form.password.trim() || undefined,
    };

    if (!payload.fullName || !payload.login) {
      setFormError('F.I.SH va login majburiy.');
      return;
    }
    if (!editingId && !payload.password) {
      setFormError('Yangi xodim uchun parol majburiy.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/laboratory/staff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = (await res.json()) as { item?: LaboratoryStaffRow; error?: string };
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
      toast.success(editingId ? 'Xodim yangilandi' : 'Xodim qo‘shildi');
      setDialogOpen(false);
      setEditingId(null);
    } catch {
      setFormError('Tarmoq xatoligi');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(
        `/api/laboratory/staff?id=${encodeURIComponent(deleteId)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'O‘chirib bo‘lmadi');
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success('Xodim o‘chirildi');
      setDeleteId(null);
    } catch {
      toast.error('Tarmoq xatoligi');
    }
  }

  return (
    <div className="mt-3 space-y-6">
      <UsersStaffHero
        eyebrow="Laboratoriya"
        title="Laboratoriya xodimlari"
        subtitle={
          summary.departments > 0 ?
            `${summary.total} ta xodim · ${summary.departments} ta bo‘lim`
          : `${summary.total} ta xodim`
        }
        icon={Microscope}
        addLabel="Yangi xodim"
        onAdd={openCreate}
      />

      <UsersStaffTableSection
        title="Xodimlar ro‘yxati"
        filteredCount={filtered.length}
        totalCount={rows.length}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Qidirish: F.I.SH, bo‘lim, mutaxassislik, login...">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <TableHead className="w-12 text-xs font-semibold text-slate-500">
                #
              </TableHead>
              <UsersSortableHead
                title="F.I.SH"
                sortKey="fullName"
                className="min-w-[220px]"
                sort={sort}
                onSort={changeSort}
              />
              <UsersSortableHead
                title="Mutaxassislik"
                sortKey="specialty"
                sort={sort}
                onSort={changeSort}
              />
              <UsersSortableHead
                title="Bo'lim"
                sortKey="department"
                className="min-w-[220px]"
                sort={sort}
                onSort={changeSort}
              />
              <UsersSortableHead
                title="Login"
                sortKey="login"
                sort={sort}
                onSort={changeSort}
              />
              <TableHead className="text-right text-xs font-semibold text-slate-500">
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
                <UsersStaffNameCell fullName={row.fullName} />
                <UsersStaffSpecialtyBadge specialty={row.specialty} />
                <UsersStaffDepartmentCell department={row.department} />
                <UsersStaffLoginCode login={row.login} />
                <UsersStaffActionsCell
                  onEdit={() => openEdit(row)}
                  onDelete={() => setDeleteId(row.id)}
                />
              </TableRow>
            ))}
            {(loading || filtered.length === 0) && (
              <UsersStaffEmptyRow
                colSpan={6}
                icon={Microscope}
                loading={loading}
                title="Laboratoriya xodimi topilmadi"
                description="Qidiruv so‘zini o‘zgartiring yoki yangi xodim qo‘shing."
                addLabel="Yangi xodim"
                onAdd={openCreate}
              />
            )}
          </TableBody>
        </Table>
      </UsersStaffTableSection>

      <UsersStaffFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={!!editingId}
        icon={Microscope}
        createTitle="Yangi laboratoriya xodimi"
        editTitle="Xodimni tahrirlash"
        createDescription="Laboratoriya xodimi profili va portal kirish ma’lumotlarini kiriting."
        editDescription="Xodim ma’lumotlari va tizimga kirish loginini yangilang."
        saving={saving}
        createSaveLabel="Xodim qo‘shish"
        saveLabel="O‘zgarishlarni saqlash"
        onSave={() => void saveRow()}
        error={formError || undefined}
        hint={!editingId ? <UsersStaffPortalHint path="/labaratoriya" /> : undefined}>
        <UsersStaffFormSection title="Shaxsiy ma’lumotlar" icon={UserRound}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel htmlFor="l-full" icon={UserRound}>
                F.I.SH
              </UsersStaffFieldLabel>
              <Input
                id="l-full"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Masalan: Karimova Nilufar Olim qizi"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="l-special" icon={Microscope}>
                Mutaxassislik
              </UsersStaffFieldLabel>
              <Input
                id="l-special"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Masalan: Laborant, bioximik"
                value={form.specialty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, specialty: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel icon={Building2}>Bo&apos;lim</UsersStaffFieldLabel>
              <UsersStaffDepartmentSelect
                value={form.department}
                roleKey="laboratory"
                className={USERS_STAFF_FIELD_CLASS}
                onChange={(department) =>
                  setForm((f) => ({ ...f, department }))
                }
              />
            </div>
          </div>
        </UsersStaffFormSection>

        <UsersStaffFormSection
          title="Tizimga kirish"
          icon={KeyRound}
          variant="violet">
          <div className="grid gap-4">
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="l-login" icon={UserRound}>
                Login
              </UsersStaffFieldLabel>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="l-login"
                  autoComplete="username"
                  className={cn(USERS_STAFF_FIELD_CLASS, 'pl-10 font-mono')}
                  placeholder="masalan: n.karimova"
                  value={form.login}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, login: e.target.value }))
                  }
                />
              </div>
            </div>
            <UsersStaffPasswordField
              id="l-password"
              value={form.password}
              editing={!!editingId}
              showPassword={showPassword}
              onChange={(value) => setForm((f) => ({ ...f, password: value }))}
              onToggleShow={() => setShowPassword((value) => !value)}
              onGenerate={() => {
                setShowPassword(true);
                setForm((f) => ({ ...f, password: generateStaffPassword() }));
              }}
            />
          </div>
        </UsersStaffFormSection>
      </UsersStaffFormDialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xodimni o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.fullName} o&apos;chirilsinmi?` : ''}
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
