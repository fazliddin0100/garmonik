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
  UsersStaffActionsCell,
  UsersStaffDepartmentCell,
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
  UsersSortableHead,
} from '@/components/users/users-staff-ui';
import {
  nurseStaffRoleLabel,
  type NurseRow,
  type NurseSortKey,
  type NurseStaffRole,
} from '@/lib/nurses/types';
import { generateStaffPassword } from '@/lib/staff-portal/generate-password';
import { cn } from '@/lib/utils';
import {
  Bandage,
  Building2,
  KeyRound,
  Phone,
  UserRound,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: NurseSortKey;
  direction: 'asc' | 'desc';
};

type NurseForm = {
  fullName: string;
  specialty: string;
  department: string;
  contact: string;
  login: string;
  password: string;
  staffRole: NurseStaffRole;
};

function emptyForm(): NurseForm {
  return {
    fullName: '',
    specialty: '',
    department: '',
    contact: '',
    login: '',
    password: generateStaffPassword(),
    staffRole: 'nurse',
  };
}

export default function NursesPanel() {
  const [rows, setRows] = useState<NurseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: 'fullName', direction: 'asc' });
  const [query, setQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NurseForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function loadRows() {
    setLoading(true);
    try {
      const res = await fetch('/api/nurses/staff', { credentials: 'include' });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as { items?: NurseRow[] };
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch {
      setRows([]);
      toast.error('Hamshiralarni yuklab bo‘lmadi');
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
      [
        row.fullName,
        row.specialty,
        row.department,
        row.contact,
        row.login,
        nurseStaffRoleLabel(row.staffRole || 'nurse'),
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

  function changeSort(key: NurseSortKey) {
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

  function openEdit(row: NurseRow) {
    setEditingId(row.id);
    setFormError('');
    setForm({
      fullName: row.fullName,
      specialty: row.specialty,
      department: row.department,
      contact: row.contact,
      login: row.login,
      password: '',
      staffRole: row.staffRole || 'nurse',
    });
    setShowPassword(false);
    setDialogOpen(true);
  }

  async function saveRow() {
    const payload = {
      fullName: form.fullName.trim(),
      specialty: form.specialty.trim(),
      department: form.department.trim(),
      contact: form.contact.trim(),
      login: form.login.trim().toLowerCase(),
      password: form.password.trim() || undefined,
      staffRole: form.staffRole,
    };

    if (!payload.fullName || !payload.login) {
      setFormError('F.I.SH va login majburiy.');
      return;
    }
    if (!editingId && !payload.password) {
      setFormError('Yangi hamshira uchun parol majburiy.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/nurses/staff', {
        method: editingId ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = (await res.json()) as { item?: NurseRow; error?: string };
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
      toast.success(editingId ? 'Hamshira yangilandi' : 'Hamshira qo‘shildi');
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
        `/api/nurses/staff?id=${encodeURIComponent(deleteId)}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'O‘chirib bo‘lmadi');
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success('Hamshira o‘chirildi');
      setDeleteId(null);
    } catch {
      toast.error('Tarmoq xatoligi');
    }
  }

  return (
    <div className="mt-3 space-y-6">
      <UsersStaffHero
        eyebrow="Tibbiy xodimlar"
        title="Hamshiralar"
        subtitle={`${summary.total} ta xodim${
          summary.departments > 0 ? ` · ${summary.departments} ta bo‘lim` : ''
        }`}
        icon={Bandage}
        addLabel="Yangi hamshira"
        onAdd={openCreate}
      />

      <UsersStaffTableSection
        title="Hamshiralar ro‘yxati"
        filteredCount={filtered.length}
        totalCount={rows.length}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Qidirish: F.I.SH, rol, bo‘lim, mutaxassislik, login...">
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
                title="Rol"
                sortKey="staffRole"
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
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                      row.staffRole === 'head_nurse' ?
                        'bg-rose-100 text-rose-800'
                      : 'bg-violet-100 text-violet-800',
                    )}>
                    {nurseStaffRoleLabel(row.staffRole || 'nurse')}
                  </span>
                </TableCell>
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
                colSpan={7}
                icon={Bandage}
                loading={loading}
                title="Hamshira topilmadi"
                description="Qidiruv so‘zini o‘zgartiring yoki yangi hamshira qo‘shing."
                addLabel="Yangi hamshira"
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
        icon={Bandage}
        createTitle="Yangi hamshira"
        editTitle="Hamshirani tahrirlash"
        createDescription="Hamshira profili va portal kirish ma’lumotlarini bir joyda kiriting."
        editDescription="Hamshira ma’lumotlari va tizimga kirish loginini yangilang."
        saving={saving}
        createSaveLabel="Hamshira qo‘shish"
        saveLabel="O‘zgarishlarni saqlash"
        onSave={() => void saveRow()}
        error={formError || undefined}
        hint={
          !editingId ?
            <UsersStaffPortalHint
              path={
                form.staffRole === 'head_nurse' ? '/bosh-hamshira' : '/hamshiralar'
              }
            />
          : undefined
        }>
        <UsersStaffFormSection title="Shaxsiy ma’lumotlar" icon={UserRound}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel htmlFor="n-full" icon={UserRound}>
                F.I.SH
              </UsersStaffFieldLabel>
              <Input
                id="n-full"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Masalan: Karimova Dilnoza Olim qizi"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel htmlFor="n-role" icon={Bandage}>
                Rol
              </UsersStaffFieldLabel>
              <select
                id="n-role"
                className={cn(
                  USERS_STAFF_FIELD_CLASS,
                  'w-full px-3 text-sm outline-none',
                )}
                value={form.staffRole}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    staffRole: e.target.value as NurseStaffRole,
                  }))
                }>
                <option value="nurse">Hamshira</option>
                <option value="head_nurse">Bosh hamshira</option>
              </select>
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="n-special" icon={Bandage}>
                Mutaxassislik
              </UsersStaffFieldLabel>
              <Input
                id="n-special"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Masalan: Hamshira, protsedura hamshirasi"
                value={form.specialty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, specialty: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <UsersStaffFieldLabel htmlFor="n-dep" icon={Building2}>
                Bo&apos;lim
              </UsersStaffFieldLabel>
              <Input
                id="n-dep"
                className={USERS_STAFF_FIELD_CLASS}
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <UsersStaffFieldLabel htmlFor="n-contact" icon={Phone}>
                Bog&apos;lanish
              </UsersStaffFieldLabel>
              <Input
                id="n-contact"
                className={USERS_STAFF_FIELD_CLASS}
                placeholder="Telefon"
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
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
              <UsersStaffFieldLabel htmlFor="n-login" icon={UserRound}>
                Login
              </UsersStaffFieldLabel>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="n-login"
                  autoComplete="username"
                  className={cn(USERS_STAFF_FIELD_CLASS, 'pl-10 font-mono')}
                  placeholder="masalan: d.karimova"
                  value={form.login}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, login: e.target.value }))
                  }
                />
              </div>
            </div>
            <UsersStaffPasswordField
              id="n-password"
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
            <AlertDialogTitle>Hamshirani o&apos;chirish</AlertDialogTitle>
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
