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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  USERS_STAFF_FIELD_CLASS,
  UsersSortableHead,
  UsersStaffActionsCell,
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
  type UsersStaffSortState,
} from '@/components/users/users-staff-ui';
import { type PharmacistRow, type PharmacistSortKey } from '@/lib/pharmacists/types';
import { generateStaffPassword } from '@/lib/staff-portal/generate-password';
import { cn } from '@/lib/utils';
import { KeyRound, Pill, Shield, UserRound } from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SortState = UsersStaffSortState<PharmacistSortKey>;

type PharmacistFormState = {
  fullName: string;
  roleName: string;
  login: string;
  password: string;
};

function emptyForm(): PharmacistFormState {
  return {
    fullName: '',
    roleName: 'Farmatsevt',
    login: '',
    password: generateStaffPassword(),
  };
}

export default function PharmacistsPanel() {
  const [rows, setRows] = useState<PharmacistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState>({
    key: 'fullName',
    direction: 'asc',
  });
  const [query, setQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PharmacistFormState>(emptyForm());
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    try {
      const res = await fetch('/api/pharmacists/staff', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { items?: PharmacistRow[] };
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRows([]);
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
      [row.fullName, row.specialty, row.login]
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
      rows.map((row) => row.specialty.trim()).filter(Boolean),
    );
    return {
      total: rows.length,
      roles: roles.size,
    };
  }, [rows]);

  function changeSort(key: PharmacistSortKey) {
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

  function openEdit(row: PharmacistRow) {
    setEditingId(row.id);
    setFormError('');
    setForm({
      fullName: row.fullName,
      roleName: row.specialty || 'Farmatsevt',
      login: row.login,
      password: '',
    });
    setShowPassword(false);
    setDialogOpen(true);
  }

  async function saveRow() {
    const payload = {
      fullName: form.fullName.trim(),
      specialty: form.roleName.trim() || 'Farmatsevt',
      login: form.login.trim().toLowerCase(),
      password: form.password.trim() || undefined,
    };

    if (!payload.fullName || !payload.login) {
      setFormError('F.I.SH va login majburiy.');
      return;
    }
    if (!editingId && !payload.password) {
      setFormError('Yangi farmatsevt uchun parol majburiy.');
      return;
    }
    if (payload.password && payload.password.length < 6) {
      setFormError('Parol kamida 6 belgidan iborat bo‘lsin.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/pharmacists/staff', {
        method: editingId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingId ? { id: editingId, ...payload } : payload,
        ),
      });
      const data = (await res.json()) as {
        item?: PharmacistRow;
        error?: string;
      };
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
      toast.success(editingId ? 'Farmatsevt yangilandi' : 'Farmatsevt qo‘shildi');
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
        `/api/pharmacists/staff?id=${encodeURIComponent(deleteId)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'O‘chirib bo‘lmadi');
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success('Farmatsevt o‘chirildi');
      setDeleteId(null);
    } catch {
      toast.error('Tarmoq xatoligi');
    }
  }

  return (
    <div className="mt-3 space-y-6">
      <UsersStaffHero
        eyebrow="Dorixona xodimlari"
        title="Farmatsevtlar"
        subtitle={
          summary.roles > 0 ?
            `${summary.total} ta farmatsevt · ${summary.roles} ta lavozim · kabinet: /farmatsevt`
          : `${summary.total} ta farmatsevt · kabinet: /farmatsevt`
        }
        icon={Pill}
        addLabel="Yangi farmatsevt"
        onAdd={openCreate}
      />

      <UsersStaffTableSection
        title="Farmatsevtlar ro‘yxati"
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
                sortKey="fullName"
                className="min-w-55"
                sort={sort}
                onSort={changeSort}
              />
              <UsersSortableHead
                title="Lavozim"
                sortKey="specialty"
                sort={sort}
                onSort={changeSort}
              />
              <UsersSortableHead
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
            {filtered.map((row) => (
              <TableRow
                key={row.id}
                className="border-slate-100 transition-colors hover:bg-violet-50/40">
                <UsersStaffNameCell fullName={row.fullName} />
                <UsersStaffSpecialtyBadge specialty={row.specialty} />
                <UsersStaffLoginCode login={row.login} />
                <UsersStaffActionsCell
                  onEdit={() => openEdit(row)}
                  onDelete={() => setDeleteId(row.id)}
                />
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <UsersStaffEmptyRow
                colSpan={4}
                icon={Pill}
                loading={loading}
                title="Farmatsevt topilmadi"
                description={
                  query.trim() ?
                    'Qidiruv so‘zini o‘zgartiring yoki yangi farmatsevt qo‘shing.'
                  : 'Hozircha farmatsevtlar ro‘yxati bo‘sh.'
                }
                addLabel="Yangi farmatsevt"
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
        icon={Pill}
        createTitle="Yangi farmatsevt"
        editTitle="Farmatsevtni tahrirlash"
        createDescription="Login/parol bilan /farmatsevt kabinetiga kiradi — mahsulotlarni ko‘radi."
        editDescription="Farmatsevt ma’lumotlarini yangilang."
        error={formError}
        createSaveLabel="Farmatsevt qo‘shish"
        onSave={() => void saveRow()}
        saving={saving}
        hint={
          !editingId ?
            <UsersStaffPortalHint path="/farmatsevt" />
          : undefined
        }>
        <UsersStaffFormSection title="Shaxsiy ma’lumotlar" icon={UserRound}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel htmlFor="p-full" icon={UserRound}>
                F.I.Sh
              </UsersStaffFieldLabel>
              <Input
                id="p-full"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Masalan: Ismoilova Malika Sherzod qizi"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel htmlFor="p-role" icon={Shield}>
                Lavozim
              </UsersStaffFieldLabel>
              <Input
                id="p-role"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Masalan: Farmatsevt"
                value={form.roleName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, roleName: e.target.value }))
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
              <UsersStaffFieldLabel htmlFor="p-login" icon={UserRound}>
                Login
              </UsersStaffFieldLabel>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="p-login"
                  autoComplete="username"
                  className={cn(USERS_STAFF_FIELD_CLASS, 'pl-10 font-mono')}
                  placeholder="masalan: m.ismoilova"
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
              id="p-password"
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
        onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Farmatsevtni o&lsquo;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `${deleteTarget.fullName} o&lsquo;chirilsinmi? Kabinetga kirish ham o‘chadi.`
              : ''}
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
