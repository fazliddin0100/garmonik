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
import {
  USERS_STAFF_FIELD_CLASS,
  UsersStaffEmptyRow,
  UsersStaffFormDialog,
  UsersStaffHero,
  UsersStaffLoginCode,
  UsersStaffTableSection,
  UsersSortableHead,
  staffInitials,
} from '@/components/users/users-staff-ui';
import { cn } from '@/lib/utils';
import {
  ADMIN_CREATION_ROLE_OPTIONS,
  defaultAdminCreationRole,
} from '@/lib/admins/roles';
import {
  adminDisplayName,
  type AdminSortKey,
  type AdminUser,
} from '@/lib/admins/types';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import {
  CalendarDays,
  KeyRound,
  Loader2,
  Lock,
  Pencil,
  Phone,
  Plus,
  Shield,
  Trash2,
  UserRound,
  UserRoundCog,
} from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type SortState = {
  key: AdminSortKey;
  direction: 'asc' | 'desc';
};

type AdminForm = Pick<
  AdminUser,
  | 'firstName'
  | 'lastName'
  | 'fatherName'
  | 'age'
  | 'roleName'
  | 'username'
  | 'phone'
>;

const UZ_PHONE_PREFIX = '+998';

/** +998 dan keyingi 9 ta milliy raqam (0–9). */
function uzPhoneSuffixDigits(phone: string): string {
  const t = phone.trim();
  if (!t) return '';
  const digits = t.replace(/\D/g, '');
  if (digits.startsWith('998')) return digits.slice(3, 12);
  return digits.slice(0, 9);
}

function uzPhoneFromSuffix(suffixDigits: string): string {
  const d = suffixDigits.replace(/\D/g, '').slice(0, 9);
  return d ? `${UZ_PHONE_PREFIX}${d}` : '';
}

function UzPhonePrefixInput(props: {
  id: string;
  value: string;
  onChange: (full: string) => void;
}) {
  const suffix = uzPhoneSuffixDigits(props.value);
  return (
    <div className="flex h-11 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 font-mono transition focus-within:border-violet-400 focus-within:bg-white">
      <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-100/90 px-3 text-[13px] font-semibold text-slate-700">
        {UZ_PHONE_PREFIX}
      </span>
      <Input
        id={props.id}
        type="text"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={9}
        placeholder="901234567"
        value={suffix}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 9);
          props.onChange(uzPhoneFromSuffix(d));
        }}
        className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}

function normalizeStoredAdmin(item: unknown): AdminUser | null {
  if (!item || typeof item !== 'object') return null;
  const r = item as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  if (typeof r.username !== 'string') return null;
  if (typeof r.password !== 'string' || typeof r.securityPin !== 'string')
    return null;

  const legacyShort = typeof r.shortName === 'string' ? r.shortName.trim() : '';
  let firstName = typeof r.firstName === 'string' ? r.firstName.trim() : '';
  let lastName = typeof r.lastName === 'string' ? r.lastName.trim() : '';
  if (!firstName && !lastName && legacyShort) {
    const bits = legacyShort.split(/\s+/).filter(Boolean);
    if (bits.length === 1) {
      firstName = bits[0] ?? '';
      lastName = '';
    } else {
      firstName = bits[0] ?? '';
      lastName = bits.slice(1).join(' ');
    }
  }
  if (!firstName && !lastName) return null;

  let age = 0;
  if (typeof r.age === 'number' && Number.isFinite(r.age)) {
    age = Math.round(r.age);
  } else if (typeof r.age === 'string' && r.age.trim()) {
    const n = Number.parseInt(r.age, 10);
    if (Number.isFinite(n)) age = n;
  }
  if (age < 1 || age > 120) age = 25;

  const phoneRaw =
    typeof r.phone === 'string' ? r.phone
    : typeof r.email === 'string' ? r.email
    : '';
  const suf = uzPhoneSuffixDigits(phoneRaw.trim());
  const phone = suf.length > 0 ? `${UZ_PHONE_PREFIX}${suf}` : '';
  const roleRaw = typeof r.roleName === 'string' ? r.roleName.trim() : '';
  let fatherName = typeof r.fatherName === 'string' ? r.fatherName.trim() : '';
  if (!fatherName) fatherName = '—';

  return {
    id: r.id.trim(),
    firstName,
    lastName,
    fatherName,
    age,
    username: typeof r.username === 'string' ? r.username.trim() : '',
    roleName: roleRaw || defaultAdminCreationRole(),
    phone,
    password: r.password,
    securityPin:
      typeof r.securityPin === 'string' ? r.securityPin.trim() : '1111',
  };
}

function emptyForm(): AdminForm {
  return {
    firstName: '',
    lastName: '',
    fatherName: '',
    age: 25,
    roleName: defaultAdminCreationRole(),
    username: '',
    phone: '',
  };
}

function loginIsoFor(username: string, map: Record<string, string>): string {
  return map[username.trim().toLowerCase()] ?? '';
}

function formatLastLogin(iso: string): string {
  if (!iso) return 'Hali kirmagan';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}.${dd}.${mm} soat ${hh}:${mi} da kirdi`;
}

function adminSearchHaystack(
  row: AdminUser,
  lastLoginByLogin: Record<string, string>,
): string {
  return [
    row.firstName,
    row.lastName,
    row.fatherName,
    String(row.age),
    row.roleName,
    row.username,
    row.phone,
    formatLastLogin(loginIsoFor(row.username, lastLoginByLogin)),
  ]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ');
}

export default function AdminsPanel() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState>({
    key: 'lastName',
    direction: 'asc',
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdAdminId, setPwdAdminId] = useState<string | null>(null);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const skipFirstPersist = useRef(true);
  const [lastLoginByLogin, setLastLoginByLogin] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const parsed = await fetchClinicResource<unknown[]>('admins');
          let next: AdminUser[] = [];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const validRows = parsed
              .map(normalizeStoredAdmin)
              .filter((x): x is AdminUser => x !== null);
            if (validRows.length > 0) next = validRows;
          }
          startTransition(() => {
            if (cancelled) return;
            setRows(next);
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
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/admin/login-meta', {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          items?: { login: string; lastLoginAt: string | null }[];
        };
        const next: Record<string, string> = {};
        for (const it of data.items ?? []) {
          const login =
            typeof it.login === 'string' ? it.login.trim().toLowerCase() : '';
          if (!login) continue;
          next[login] = it.lastLoginAt ?? '';
        }
        if (!cancelled) setLastLoginByLogin(next);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, rows.length]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    void (async () => {
      try {
        await saveClinicResource('admins', rows);
      } catch {
        toast.error('Administratorlar ro‘yxatini saqlab bo‘lmadi');
      }
    })();
  }, [rows, hydrated]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      adminSearchHaystack(r, lastLoginByLogin).includes(q),
    );
  }, [rows, searchQuery, lastLoginByLogin]);

  const sorted = useMemo(() => {
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === 'lastLoginAt') {
        const ia = loginIsoFor(a.username, lastLoginByLogin);
        const ib = loginIsoFor(b.username, lastLoginByLogin);
        return ia.localeCompare(ib) * factor;
      }
      const key = sort.key;
      if (key === 'age') {
        return (a.age - b.age) * factor;
      }
      const cmp = String(a[key] ?? '').localeCompare(
        String(b[key] ?? ''),
        'uz',
        {
          numeric: true,
        },
      );
      return cmp * factor;
    });
  }, [filtered, sort, lastLoginByLogin]);

  const roleSelectOptions = useMemo((): { value: string; label: string }[] => {
    const base = ADMIN_CREATION_ROLE_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
    }));
    const seen = new Set(base.map((b) => b.value));

    if (editingId) {
      for (const r of rows) {
        if (r.id !== editingId) continue;
        if (r.roleName && !seen.has(r.roleName)) {
          seen.add(r.roleName);
          base.push({ value: r.roleName, label: `${r.roleName} (saqlangan)` });
        }
      }
    }

    if (form.roleName && !seen.has(form.roleName)) {
      base.push({
        value: form.roleName,
        label: `${form.roleName} (saqlangan)`,
      });
    }
    return base;
  }, [rows, form.roleName, editingId]);

  const deleteTarget = useMemo(
    () => rows.find((r) => r.id === deleteId) ?? null,
    [rows, deleteId],
  );

  const pwdTarget = useMemo(
    () => rows.find((r) => r.id === pwdAdminId) ?? null,
    [rows, pwdAdminId],
  );

  function changeSort(key: AdminSortKey) {
    setSort((prev) =>
      prev.key === key ?
        { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' },
    );
  }

  function openCreate() {
    setEditingId(null);
    setFormError('');
    setCreatePassword('');
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(row: AdminUser) {
    setEditingId(row.id);
    setFormError('');
    setCreatePassword('');
    setForm({
      firstName: row.firstName,
      lastName: row.lastName,
      fatherName: row.fatherName === '—' ? '' : row.fatherName,
      age: row.age,
      username: row.username,
      roleName: row.roleName,
      phone: row.phone,
    });
    setDialogOpen(true);
  }

  async function saveNewAdmin() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fatherName = form.fatherName.trim();
    const age = Math.round(Number(form.age));
    const roleName = form.roleName.trim();
    const loginInput = form.username.trim();
    const loginNorm = loginInput.toLowerCase();
    const phone = form.phone.trim();
    const password = createPassword;

    if (!firstName || !lastName) {
      setFormError('Ism va familiyani kiriting.');
      return;
    }
    if (!fatherName) {
      setFormError('Otasining ismini kiriting.');
      return;
    }
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      setFormError('Yosh 1–120 orasida bo‘lsin.');
      return;
    }
    if (!roleName) {
      setFormError('Rolni tanlang.');
      return;
    }
    if (!loginInput) {
      setFormError('Login kiriting.');
      return;
    }
    if (!/^\+998\d{9}$/.test(phone)) {
      setFormError('+998 dan keyin 9 ta raqam kiriting.');
      return;
    }
    if (password.length < 6) {
      setFormError('Parol kamida 6 belgidan iborat bo‘lsin.');
      return;
    }

    const dupUser = rows.some(
      (r) => r.username.trim().toLowerCase() === loginNorm,
    );
    if (dupUser) {
      setFormError('Bu login ro‘yxatda allaqachon bor.');
      return;
    }

    setCreateSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/create-portal-admin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          fatherName,
          age,
          roleName,
          login: loginInput,
          password,
          phone,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        userId?: string;
        login?: string;
        firstName?: string;
        lastName?: string;
        fatherName?: string;
        age?: number;
        roleName?: string;
        phone?: string;
      };
      if (!res.ok) {
        setFormError(data.error || 'Tizimda yaratib bo‘lmadi');
        toast.error(data.error || 'Xatolik');
        return;
      }

      const resolvedLogin =
        typeof data.login === 'string' ? data.login : loginNorm;
      const id =
        typeof data.userId === 'string' && data.userId.trim() ?
          data.userId.trim()
        : typeof crypto !== 'undefined' && 'randomUUID' in crypto ?
          crypto.randomUUID()
        : `id-${Date.now()}`;

      setRows((prev) => [
        ...prev,
        {
          id,
          firstName:
            typeof data.firstName === 'string' ? data.firstName : firstName,
          lastName:
            typeof data.lastName === 'string' ? data.lastName : lastName,
          fatherName:
            typeof data.fatherName === 'string' ? data.fatherName : fatherName,
          age: typeof data.age === 'number' ? data.age : age,
          username: resolvedLogin,
          roleName:
            typeof data.roleName === 'string' ? data.roleName : roleName,
          phone: typeof data.phone === 'string' ? data.phone : phone,
          password,
          securityPin: '1111',
        },
      ]);
      toast.success(
        'Foydalanuvchi yaratildi — tizimga shu login va parol bilan kiradi.',
      );
      setDialogOpen(false);
      setEditingId(null);
      setCreatePassword('');
    } catch {
      setFormError('Tarmoq xatoligi');
      toast.error('Tarmoq xatoligi');
    } finally {
      setCreateSaving(false);
    }
  }

  async function saveEditAdmin() {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fatherName = form.fatherName.trim();
    const age = Math.round(Number(form.age));
    const username = form.username.trim();
    const roleName = form.roleName.trim();
    const phone = form.phone.trim();

    if (!firstName || !lastName) {
      setFormError('Ism va familiya majburiy.');
      return;
    }
    if (!fatherName) {
      setFormError('Otasining ismi majburiy.');
      return;
    }
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      setFormError('Yosh 1–120 orasida bo‘lsin.');
      return;
    }
    if (!username || !roleName) {
      setFormError('Login va rol majburiy.');
      return;
    }
    if (!/^\+998\d{9}$/.test(phone)) {
      setFormError('+998 dan keyin 9 ta raqam kiriting.');
      return;
    }

    const dupUser = rows.some(
      (r) =>
        r.username.trim().toLowerCase() === username.toLowerCase() &&
        (!editingId || r.id !== editingId),
    );
    if (dupUser) {
      setFormError('Bu login allaqachon mavjud.');
      return;
    }

    if (!editingId) return;
    const previous = rows.find((r) => r.id === editingId);
    if (!previous) return;

    try {
      const res = await fetch('/api/admin/update-portal-admin', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingId,
          login: previous.username.trim().toLowerCase(),
          newLogin: username.toLowerCase(),
          firstName,
          lastName,
          fatherName,
          age,
          roleName,
          phone,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        userId?: string;
      };
      if (!res.ok) {
        setFormError(data.error || 'Portalda yangilab bo‘lmadi');
        toast.error(data.error || 'Yangilab bo‘lmadi');
        return;
      }

      const resolvedId =
        typeof data.userId === 'string' && data.userId.trim() ?
          data.userId.trim()
        : editingId;

      setRows((prev) =>
        prev.map((r) =>
          r.id === editingId ?
            {
              ...r,
              id: resolvedId,
              firstName,
              lastName,
              fatherName,
              age,
              username,
              roleName,
              phone,
            }
          : r,
        ),
      );
      toast.success('Foydalanuvchi ma’lumotlari yangilandi');
      setDialogOpen(false);
      setEditingId(null);
    } catch {
      setFormError('Tarmoq xatoligi');
      toast.error('Tarmoq xatoligi');
    }
  }

  function saveAdmin() {
    if (!editingId) {
      void saveNewAdmin();
      return;
    }
    void saveEditAdmin();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const target = rows.find((r) => r.id === deleteId);
    if (!target) {
      setDeleteId(null);
      return;
    }
    try {
      const res = await fetch('/api/admin/update-portal-admin', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: target.id,
          login: target.username.trim().toLowerCase(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error || 'O‘chirib bo‘lmadi');
        setDeleteId(null);
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success('Foydalanuvchi o‘chirildi');
    } catch {
      toast.error('Tarmoq xatoligi');
    } finally {
      setDeleteId(null);
    }
  }

  function openPasswordDialog(adminId: string) {
    setPwdAdminId(adminId);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdError('');
    setPwdOpen(true);
  }

  async function savePassword() {
    if (!pwdTarget) return;
    if (!currentPwd) {
      setPwdError('Joriy parolni kiriting (tizimga kirgan parolingiz).');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('Yangi parol kamida 6 belgidan iborat bo‘lsin.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('Yangi parol va tasdiq bir xil emas.');
      return;
    }

    setPwdSaving(true);
    setPwdError('');
    try {
      const res = await fetch('/api/admin/sync-mongo-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: pwdTarget.username.trim(),
          currentPassword: currentPwd,
          newPassword: newPwd,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setPwdError(data.error || 'Parolni MongoDBga yozib bo‘lmadi');
        toast.error(data.error || 'Parolni MongoDBga yozib bo‘lmadi');
        return;
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === pwdTarget.id ? { ...r, password: newPwd } : r,
        ),
      );
      toast.success(data.message ?? 'Parol tizimda (MongoDB) yangilandi');
      setPwdOpen(false);
      setPwdAdminId(null);
    } catch {
      setPwdError('Tarmoq xatoligi');
      toast.error('Tarmoq xatoligi');
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <>
      <div className="mt-3 space-y-6">
        <UsersStaffHero
          eyebrow="Tizim boshqaruvi"
          title="Administratorlar"
          subtitle={`${rows.length} ta foydalanuvchi — admin paneli va tizim sozlamalari`}
          icon={UserRoundCog}
          addLabel="Yangi foydalanuvchi"
          onAdd={openCreate}
        />

        <UsersStaffTableSection
          title="Foydalanuvchilar (admin) ro‘yxati"
          filteredCount={filtered.length}
          totalCount={rows.length}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          searchPlaceholder="Qidirish: ism, familiya, rol, login, telefon...">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <TableRow className="border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                <UsersSortableHead
                  title="Ism"
                  sortKey="firstName"
                  sort={sort}
                  onSort={changeSort}
                />
                <UsersSortableHead
                  title="Familiya"
                  sortKey="lastName"
                  sort={sort}
                  onSort={changeSort}
                />
                <UsersSortableHead
                  title="Otasining ismi"
                  sortKey="fatherName"
                  sort={sort}
                  onSort={changeSort}
                />
                <UsersSortableHead
                  title="Yosh"
                  sortKey="age"
                  sort={sort}
                  onSort={changeSort}
                />
                <UsersSortableHead
                  title="Rol"
                  sortKey="roleName"
                  className="min-w-50"
                  sort={sort}
                  onSort={changeSort}
                />
                <UsersSortableHead
                  title="Login"
                  sortKey="username"
                  sort={sort}
                  onSort={changeSort}
                />
                <UsersSortableHead
                  title="Telefon"
                  sortKey="phone"
                  sort={sort}
                  onSort={changeSort}
                />
                <UsersSortableHead
                  title="Tizimga kirish"
                  sortKey="lastLoginAt"
                  className="min-w-44"
                  sort={sort}
                  onSort={changeSort}
                />
                <TableHead className="text-right text-xs font-semibold text-slate-500">
                  Amallar
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hydrated ?
                <UsersStaffEmptyRow
                  colSpan={9}
                  icon={UserRoundCog}
                  title="Yuklanmoqda"
                  description=""
                  loading
                />
              : rows.length === 0 ?
                <UsersStaffEmptyRow
                  colSpan={9}
                  icon={UserRoundCog}
                  title="Hozircha yozuv yo‘q"
                  description="Birinchi administratorni qo‘shing — login va parol bilan tizimga kira oladi."
                  addLabel="Yangi foydalanuvchi"
                  onAdd={openCreate}
                />
              : sorted.length === 0 ?
                <UsersStaffEmptyRow
                  colSpan={9}
                  icon={UserRoundCog}
                  title="Natija topilmadi"
                  description="Qidiruv so‘zini o‘zgartiring yoki filterni tozalang."
                />
              : sorted.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-slate-100 transition-colors hover:bg-violet-50/40">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-100 to-indigo-100 text-xs font-bold text-violet-700">
                          {staffInitials(adminDisplayName(row))}
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {row.firstName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-800">
                      {row.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {row.fatherName || (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-slate-600">
                      {row.age || <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm">
                      {row.roleName ?
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
                          {row.roleName}
                        </span>
                      : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <UsersStaffLoginCode login={row.username} />
                    <TableCell className="text-sm">
                      {row.phone ?
                        <span className="font-mono text-xs text-slate-700">
                          {row.phone}
                        </span>
                      : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatLastLogin(
                        loginIsoFor(row.username, lastLoginByLogin),
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700"
                          onClick={() => openPasswordDialog(row.id)}
                          aria-label="Parolni almashtirish">
                          <KeyRound className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-lg text-slate-500 hover:bg-violet-100 hover:text-violet-700"
                          onClick={() => openEdit(row)}
                          aria-label="Tahrirlash">
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setDeleteId(row.id)}
                          aria-label="O'chirish">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </UsersStaffTableSection>
      </div>

      <UsersStaffFormDialog
        open={dialogOpen && !!editingId}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setEditingId(null);
            setFormError('');
            setCreatePassword('');
          }
        }}
        editing
        icon={UserRound}
        createTitle=""
        editTitle="Foydalanuvchini tahrirlash"
        createDescription=""
        editDescription="Ro‘yxatdagi qator — tizimga kirish paroli alohida «parol» tugmasi orqali."
        onSave={saveAdmin}
        error={formError}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="u-first">Ism</Label>
            <Input
              id="u-first"
              className={USERS_STAFF_FIELD_CLASS}
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-last">Familiya</Label>
            <Input
              id="u-last"
              className={USERS_STAFF_FIELD_CLASS}
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="u-father">Otasining ismi</Label>
            <Input
              id="u-father"
              className={USERS_STAFF_FIELD_CLASS}
              value={form.fatherName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fatherName: e.target.value }))
              }
              placeholder="Olimovich"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-age">Yosh</Label>
            <Input
              id="u-age"
              type="number"
              min={1}
              max={120}
              className={USERS_STAFF_FIELD_CLASS}
              value={form.age || ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  age: Number.parseInt(e.target.value, 10) || 0,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-username">Login</Label>
            <Input
              id="u-username"
              className={cn(USERS_STAFF_FIELD_CLASS, 'font-mono')}
              value={form.username}
              onChange={(e) =>
                setForm((f) => ({ ...f, username: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="u-role">Rol</Label>
            <Select
              value={form.roleName}
              onValueChange={(v) => setForm((f) => ({ ...f, roleName: v }))}>
              <SelectTrigger
                id="u-role"
                className={cn('w-full', USERS_STAFF_FIELD_CLASS)}
                title="Foydalanuvchi roli">
                <SelectValue placeholder="Rolni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {roleSelectOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="u-phone">Telefon raqami (O‘zbekiston)</Label>
            <UzPhonePrefixInput
              id="u-phone"
              value={form.phone}
              onChange={(full) => setForm((f) => ({ ...f, phone: full }))}
            />
            <p className="text-[11px] text-slate-500">
              +998 qismi avtomatik; qolgan 9 raqamni kiriting.
            </p>
          </div>
        </div>
      </UsersStaffFormDialog>

      <Dialog
        open={dialogOpen && !editingId}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setFormError('');
            setCreatePassword('');
            setCreateSaving(false);
          }
        }}>
        <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[540px]">
            <div className="relative max-h-[min(90vh,720px)] overflow-hidden rounded-3xl border border-violet-200/60 bg-white shadow-2xl shadow-violet-900/10">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-violet-500/18 via-indigo-500/6 to-transparent" />
              <div className="relative max-h-[min(90vh,720px)] overflow-y-auto p-6 sm:p-8">
                <div className="mb-6 flex items-start gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/35">
                    <Shield className="size-7" />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                      Yangi administrator
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      Shaxsiy ma’lumotlar, rol va{' '}
                      <strong className="font-medium text-slate-800">
                        tizimga kirish
                      </strong>{' '}
                      (login, parol) — barchasi MongoDB va ro‘yxatga yoziladi.
                    </DialogDescription>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="c-first"
                      className="flex items-center gap-2 text-slate-700">
                      <UserRound className="size-4 text-violet-600" />
                      Ism
                    </Label>
                    <Input
                      id="c-first"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/80 transition focus-visible:border-violet-400 focus-visible:bg-white"
                      placeholder="Ali"
                      value={form.firstName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="c-last"
                      className="flex items-center gap-2 text-slate-700">
                      <UserRound className="size-4 text-violet-600" />
                      Familiya
                    </Label>
                    <Input
                      id="c-last"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/80 transition focus-visible:border-violet-400 focus-visible:bg-white"
                      placeholder="Valiyev"
                      value={form.lastName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="c-father"
                      className="flex items-center gap-2 text-slate-700">
                      <UserRound className="size-4 text-violet-600" />
                      Otasining ismi
                    </Label>
                    <Input
                      id="c-father"
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/80 transition focus-visible:border-violet-400 focus-visible:bg-white"
                      placeholder="Olim o‘g‘li"
                      value={form.fatherName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fatherName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="c-age"
                      className="flex items-center gap-2 text-slate-700">
                      <CalendarDays className="size-4 text-violet-600" />
                      Yosh
                    </Label>
                    <Input
                      id="c-age"
                      type="number"
                      min={1}
                      max={120}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50/80 transition focus-visible:border-violet-400 focus-visible:bg-white"
                      value={form.age || ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          age: Number.parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="c-role"
                      className="flex items-center gap-2 text-slate-700">
                      <Shield className="size-4 text-violet-600" />
                      Rol
                    </Label>
                    <Select
                      value={form.roleName}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, roleName: v }))
                      }>
                      <SelectTrigger
                        id="c-role"
                        className="h-11 w-full rounded-xl border-slate-200 bg-slate-50/80"
                        title="Yangi foydalanuvchi roli">
                        <SelectValue placeholder="Rolni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleSelectOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="c-login"
                      className="flex items-center gap-2 text-slate-700">
                      <UserRound className="size-4 text-violet-600" />
                      Login (tizimga kirish)
                    </Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="c-login"
                        autoComplete="username"
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 font-mono transition focus-visible:border-violet-400 focus-visible:bg-white"
                        placeholder="masalan: ali.admin"
                        value={form.username}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, username: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="c-pass"
                      className="flex items-center gap-2 text-slate-700">
                      <Lock className="size-4 text-violet-600" />
                      Parol
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="c-pass"
                        type="password"
                        autoComplete="new-password"
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 transition focus-visible:border-violet-400 focus-visible:bg-white"
                        placeholder="Kamida 6 belgi"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="c-phone"
                      className="flex items-center gap-2 text-slate-700">
                      <Phone className="size-4 text-violet-600" />
                      Telefon raqami (O‘zbekiston)
                    </Label>
                    <UzPhonePrefixInput
                      id="c-phone"
                      value={form.phone}
                      onChange={(full) =>
                        setForm((f) => ({ ...f, phone: full }))
                      }
                    />
                    <p className="text-[11px] text-slate-500">
                      +998 doimiy; masalan:{' '}
                      <span className="font-mono">90</span>
                      keyin 7 ta raqam.
                    </p>
                  </div>
                </div>

                {formError ?
                  <p className="mt-3 text-sm font-medium text-red-600">
                    {formError}
                  </p>
                : null}

                <DialogFooter className="mt-8 flex-col gap-2 border-t border-slate-100/80 pt-6 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl border-slate-200 sm:w-auto"
                    disabled={createSaving}
                    onClick={() => setDialogOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button
                    type="button"
                    disabled={createSaving}
                    className="w-full rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25 hover:from-violet-700 hover:to-indigo-700 sm:w-auto"
                    onClick={() => void saveNewAdmin()}>
                    {createSaving ?
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Yaratilmoqda…
                      </>
                    : <>
                        <Shield className="mr-2 size-4 opacity-90" />
                        Administrator yaratish
                      </>
                    }
                  </Button>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Parolni almashtirish</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pwd-current">Joriy parol</Label>
              <Input
                id="pwd-current"
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pwd-new">Yangi parol</Label>
              <Input
                id="pwd-new"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pwd-confirm">Parolni tasdiqlang</Label>
              <Input
                id="pwd-confirm"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
            </div>
            {pwdError ?
              <p className="text-sm text-red-600">{pwdError}</p>
            : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPwdOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={pwdSaving}
              onClick={() => void savePassword()}>
              {pwdSaving ? 'Saqlanmoqda...' : 'Almashtirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Foydalanuvchini o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ?
                `${adminDisplayName(deleteTarget)} o&apos;chirilsinmi?`
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
    </>
  );
}
