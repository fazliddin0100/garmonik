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
  UsersStaffTableSection,
  type UsersStaffSortState,
} from '@/components/users/users-staff-ui';
import { useClinicDepartments } from '@/hooks/useClinicDepartments';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';
import {
  type ReceptionSortKey,
  type ReceptionUser,
} from '@/lib/reception/types';
import { generateStaffPassword } from '@/lib/staff-portal/generate-password';
import { cn } from '@/lib/utils';
import { Building2, IdCard, KeyRound, UserRound } from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SortState = UsersStaffSortState<ReceptionSortKey>;

type ReceptionFormState = {
  fullName: string;
  departmentId: string;
  login: string;
  password: string;
};

function emptyForm(): ReceptionFormState {
  return {
    fullName: '',
    departmentId: '',
    login: '',
    password: generateStaffPassword(),
  };
}

function resolveDepartmentId(
  row: ReceptionUser,
  departments: DepartmentGroup[],
): string {
  const stored = row.department?.trim();
  if (stored && departments.some((d) => d.id === stored)) return stored;
  const title = row.roleName.trim();
  if (title) {
    const match = departments.find((d) => d.title === title);
    if (match) return match.id;
  }
  return '';
}

export default function ReceptionStaffPanel() {
  const { byId, departments } = useClinicDepartments();
  const [rows, setRows] = useState<ReceptionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState>({
    key: 'shortName',
    direction: 'asc',
  });
  const [query, setQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReceptionFormState>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    try {
      const res = await fetch('/api/reception/staff', { credentials: 'include' });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { items?: ReceptionUser[] };
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRows([]);
      toast.error('Qabul xodimlarini yuklab bo‘lmadi');
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

  useEffect(() => {
    if (!editingId || !dialogOpen || departments.length === 0) return;
    const row = rows.find((r) => r.id === editingId);
    if (!row) return;
    setForm((f) => {
      if (f.departmentId) return f;
      const resolved = resolveDepartmentId(row, departments);
      return resolved ? { ...f, departmentId: resolved } : f;
    });
  }, [departments, dialogOpen, editingId, rows]);

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
      [row.shortName, row.roleName, row.username]
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
    const roles = new Set(
      rows.map((row) => row.roleName.trim()).filter(Boolean),
    );
    return {
      total: rows.length,
      roles: roles.size,
    };
  }, [rows]);

  function changeSort(key: ReceptionSortKey) {
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

  function openEdit(row: ReceptionUser) {
    setEditingId(row.id);
    setFormError('');
    setForm({
      fullName: row.shortName,
      departmentId: resolveDepartmentId(row, departments),
      login: row.username,
      password: '',
    });
    setShowPassword(false);
    setDialogOpen(true);
  }

  async function saveUser() {
    const fullName = form.fullName.trim();
    const departmentId = form.departmentId.trim();
    const login = form.login.trim().toLowerCase();
    const password = form.password.trim();
    const department = byId.get(departmentId);
    const roleName = department?.title ?? '';

    if (!fullName) {
      setFormError('F.I.Sh majburiy.');
      return;
    }
    if (!departmentId || !roleName) {
      setFormError('Lavozim (bo‘lim) tanlang.');
      return;
    }
    if (!login) {
      setFormError('Login majburiy.');
      return;
    }
    if (!editingId && !password) {
      setFormError('Yangi xodim uchun parol kiriting.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/reception/staff', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingId ?
            {
              id: editingId,
              fullName,
              roleName,
              department: departmentId,
              login,
              password: password || undefined,
            }
          : {
              fullName,
              roleName,
              department: departmentId,
              login,
              password,
            },
        ),
      });
      const data = (await res.json()) as { item?: ReceptionUser; error?: string };
      if (!res.ok) {
        setFormError(data.error ?? 'Saqlab bo‘lmadi');
        return;
      }
      if (data.item) {
        setRows((prev) =>
          editingId ?
            prev.map((row) => (row.id === editingId ? data.item! : row))
          : [...prev, data.item!],
        );
      } else {
        await loadRows();
      }
      toast.success(editingId ? 'Qabul xodimi yangilandi' : 'Qabul xodimi qo‘shildi');
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
        `/api/reception/staff?id=${encodeURIComponent(deleteId)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'O‘chirib bo‘lmadi');
        return;
      }
      setRows((prev) => prev.filter((row) => row.id !== deleteId));
      toast.success('Qabul xodimi o‘chirildi');
      setDeleteId(null);
    } catch {
      toast.error('Tarmoq xatoligi');
    }
  }

  return (
    <div className="mt-3 space-y-6">
      <UsersStaffHero
        eyebrow="Registratura"
        title="Qabul xodimlari"
        subtitle={
          summary.roles > 0 ?
            `${summary.total} ta xodim · ${summary.roles} ta lavozim`
          : `${summary.total} ta xodim`
        }
        icon={IdCard}
        addLabel="Yangi qabul xodimi"
        onAdd={openCreate}
      />

      <UsersStaffTableSection
        title="Qabul xodimlari ro‘yxati"
        filteredCount={filtered.length}
        totalCount={rows.length}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Qidirish: ism, lavozim, login...">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
              <UsersSortableHead
                title="F.I.Sh"
                sortKey="shortName"
                className="min-w-55"
                sort={sort}
                onSort={changeSort}
              />
              <UsersSortableHead
                title="Lavozim"
                sortKey="roleName"
                sort={sort}
                onSort={changeSort}
              />
              <UsersSortableHead
                title="Login"
                sortKey="username"
                sort={sort}
                onSort={changeSort}
              />
              <TableHead className="w-16 text-right text-xs font-semibold text-slate-500">
                Amallar
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow
                key={row.id}
                className="border-slate-100 transition-colors hover:bg-violet-50/40">
                <UsersStaffNameCell fullName={row.shortName} />
                <UsersStaffDepartmentCell
                  department={row.department?.trim() || row.roleName}
                />
                <UsersStaffLoginCode login={row.username} />
                <UsersStaffActionsCell
                  onEdit={() => openEdit(row)}
                  onDelete={() => setDeleteId(row.id)}
                />
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <UsersStaffEmptyRow
                colSpan={4}
                icon={IdCard}
                loading={loading}
                title="Qabul xodimi topilmadi"
                description={
                  query.trim() ?
                    'Qidiruv so‘zini o‘zgartiring yoki yangi qabul xodimi qo‘shing.'
                  : 'Hozircha qabul xodimlari ro‘yxati bo‘sh.'
                }
                addLabel="Yangi qabul xodimi"
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
        icon={IdCard}
        createTitle="Yangi qabul xodimi"
        editTitle="Qabul xodimini tahrirlash"
        createDescription="Registratura xodimi profili va tizimga kirish ma’lumotlarini kiriting."
        editDescription="Qabul xodimi ma’lumotlarini yangilang."
        error={formError}
        saving={saving}
        createSaveLabel="Qabul xodimi qo‘shish"
        onSave={() => void saveUser()}
        hint={
          !editingId ?
            <UsersStaffPortalHint path="/kabinet" />
          : undefined
        }>
        <UsersStaffFormSection title="Shaxsiy ma’lumotlar" icon={UserRound}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel htmlFor="r-full" icon={UserRound}>
                F.I.Sh
              </UsersStaffFieldLabel>
              <Input
                id="r-full"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Masalan: Karimova Nodira Alisher qizi"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel icon={Building2}>
                Lavozim (bo&apos;lim)
              </UsersStaffFieldLabel>
              <UsersStaffDepartmentSelect
                value={form.departmentId}
                className={USERS_STAFF_FIELD_CLASS}
                onChange={(departmentId) =>
                  setForm((f) => ({ ...f, departmentId }))
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
              <UsersStaffFieldLabel htmlFor="r-login" icon={UserRound}>
                Login
              </UsersStaffFieldLabel>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="r-login"
                  autoComplete="username"
                  className={cn(
                    USERS_STAFF_FIELD_CLASS,
                    'pl-10 font-mono',
                  )}
                  placeholder="masalan: n.karimova"
                  value={form.login}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      login: e.target.value.toLowerCase().replace(/\s/g, ''),
                    }))
                  }
                />
              </div>
            </div>
            <UsersStaffPasswordField
              id="r-password"
              value={form.password}
              editing={!!editingId}
              showPassword={showPassword}
              onChange={(value) => setForm((f) => ({ ...f, password: value }))}
              onToggleShow={() => setShowPassword((value) => !value)}
              onGenerate={() => {
                setShowPassword(true);
                setForm((f) => ({
                  ...f,
                  password: generateStaffPassword(),
                }));
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
            <AlertDialogTitle>Xodimni o&lsquo;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.shortName} o'chirilsinmi?` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void confirmDelete()}>
              O&lsquo;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
