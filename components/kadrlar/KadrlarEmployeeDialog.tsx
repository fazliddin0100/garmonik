'use client';

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UzPhoneInput } from '@/components/ui/uz-phone-input';
import type { AdminUser } from '@/lib/admins/types';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import {
  departmentRequiredForRole,
  normalizeDepartmentGroups,
  roleMatchesDepartment,
} from '@/lib/clinic-departments/roles';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';
import {
  KADRLAR_ROLE_OPTIONS,
  getKadrlarRole,
  type KadrlarRoleOption,
} from '@/lib/kadrlar/roles';
import { isValidUzPhoneE164 } from '@/lib/phone/uz-phone';
import {
  encodeSpecialistDepartment,
  isSpecialistRoleKey,
  narrowSpecialistIdFromRoleKey,
} from '@/lib/patients/specialist-staff';
import { generateStaffPassword } from '@/lib/staff-portal/generate-password';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type FormState = {
  roleKey: string;
  fullName: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  age: number;
  phone: string;
  login: string;
  password: string;
  /** Bo‘limlar katalogidagi `dep-grp-…` id */
  departmentId: string;
};

function emptyForm(): FormState {
  return {
    roleKey: 'shifokor',
    fullName: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    age: 25,
    phone: '',
    login: '',
    password: generateStaffPassword(),
    departmentId: '',
  };
}

function resolveStoredDepartment(
  role: KadrlarRoleOption,
  departmentId: string,
): string {
  if (isSpecialistRoleKey(role.key)) {
    const sid = narrowSpecialistIdFromRoleKey(role.key);
    return sid ? encodeSpecialistDepartment(sid) : '';
  }
  return departmentId.trim();
}

async function createStaffByRole(
  role: KadrlarRoleOption,
  form: FormState,
): Promise<void> {
  const login = form.login.trim().toLowerCase();
  const password = form.password;
  const phone = form.phone.trim();
  const fullName = form.fullName.trim();
  const department = resolveStoredDepartment(role, form.departmentId);

  if (role.accountKind === 'admin') {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fatherName = form.fatherName.trim();
    const age = Math.round(Number(form.age));
    const roleName = role.roleLabel || role.label;

    if (!firstName || !lastName) {
      throw new Error('Ism va familiyani kiriting.');
    }
    if (!fatherName) {
      throw new Error('Otasining ismini kiriting.');
    }
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      throw new Error('Yosh 1–120 orasida bo‘lsin.');
    }
    if (!login) throw new Error('Login kiriting.');
    if (password.length < 6) {
      throw new Error('Parol kamida 6 belgidan iborat bo‘lsin.');
    }
    if (!isValidUzPhoneE164(phone)) {
      throw new Error('+998 dan keyin 9 ta raqam kiriting.');
    }

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
        login,
        password,
        phone,
        department,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      userId?: string;
      login?: string;
    };
    if (!res.ok) throw new Error(data.error || 'Yaratib bo‘lmadi');

    const nextAdmin: AdminUser = {
      id:
        typeof data.userId === 'string' && data.userId.trim() ?
          data.userId.trim()
        : crypto.randomUUID(),
      firstName,
      lastName,
      fatherName,
      age,
      username:
        typeof data.login === 'string' ? data.login : login,
      roleName,
      phone,
      password,
      securityPin: '1111',
    };
    const existing =
      await fetchClinicResource<AdminUser[]>('admins').catch(() => []);
    const list = Array.isArray(existing) ? existing : [];
    await saveClinicResource('admins', [...list, nextAdmin]);
    return;
  }

  if (!fullName) throw new Error('F.I.SH kiriting.');
  if (!login) throw new Error('Login kiriting.');
  if (password.length < 6) {
    throw new Error('Parol kamida 6 belgidan iborat bo‘lsin.');
  }

  const staffRole = role.staffRole;
  if (staffRole === 'shifokor' || staffRole === 'specialist') {
    const res = await fetch('/api/doctors/staff', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        specialty: role.label,
        department,
        contact: phone || undefined,
        login,
        password,
        isActive: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Yaratib bo‘lmadi');
    return;
  }

  if (staffRole === 'nurse' || staffRole === 'head_nurse') {
    const res = await fetch('/api/nurses/staff', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        specialty: role.label,
        department,
        contact: phone,
        login,
        password,
        staffRole,
        isActive: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Yaratib bo‘lmadi');
    return;
  }

  if (staffRole === 'laboratory') {
    const res = await fetch('/api/laboratory/staff', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        specialty: role.label,
        department,
        login,
        password,
        isActive: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Yaratib bo‘lmadi');
    return;
  }

  if (staffRole === 'kabinet') {
    const res = await fetch('/api/reception/staff', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        roleName: role.label,
        login,
        password,
        department,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Yaratib bo‘lmadi');
    return;
  }

  if (staffRole === 'farmatsevt') {
    const res = await fetch('/api/pharmacists/staff', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        specialty: role.label,
        department,
        login,
        password,
        isActive: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Yaratib bo‘lmadi');
    return;
  }

  if (staffRole === 'oshpaz') {
    const res = await fetch('/api/kitchen/staff', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        specialty: role.label,
        department,
        login,
        password,
        isActive: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error || 'Yaratib bo‘lmadi');
    return;
  }

  throw new Error('Bu rol uchun yaratish yo‘li topilmadi.');
}

type KadrlarEmployeeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export default function KadrlarEmployeeDialog({
  open,
  onOpenChange,
  onCreated,
}: KadrlarEmployeeDialogProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);

  const selectedRole = useMemo(
    () => getKadrlarRole(form.roleKey),
    [form.roleKey],
  );
  const isAdmin = selectedRole?.accountKind === 'admin';
  const isSpecialist = isSpecialistRoleKey(form.roleKey);
  const needsDepartment = departmentRequiredForRole(form.roleKey);

  const clinicalRoles = useMemo(
    () => KADRLAR_ROLE_OPTIONS.filter((r) => r.group === 'clinical'),
    [],
  );
  const officeRoles = useMemo(
    () => KADRLAR_ROLE_OPTIONS.filter((r) => r.group === 'office'),
    [],
  );

  const matchingDepartments = useMemo(() => {
    const withRole = departments.filter((d) => d.roleKey);
    if (!form.roleKey || isSpecialist) return withRole;
    return withRole.filter((d) => roleMatchesDepartment(form.roleKey, d));
  }, [departments, form.roleKey, isSpecialist]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const raw = await fetchClinicResource<unknown>('departments');
        if (cancelled) return;
        setDepartments(normalizeDepartmentGroups(raw));
      } catch {
        if (!cancelled) setDepartments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setForm(emptyForm());
      setError('');
    }
  }

  async function handleSave() {
    const role = getKadrlarRole(form.roleKey);
    if (!role) {
      setError('Rol tanlang.');
      return;
    }

    if (!isSpecialist && needsDepartment) {
      if (!form.departmentId.trim()) {
        setError('Bo‘lim tanlang.');
        return;
      }
      const dept =
        departments.find((d) => d.id === form.departmentId.trim()) ?? null;
      if (!dept?.roleKey) {
        setError('Tanlangan bo‘limda rol belgilanmagan.');
        return;
      }
      if (!roleMatchesDepartment(form.roleKey, dept)) {
        setError(
          `Xodim roli («${role.label}») bo‘lim roli bilan mos kelmaydi.`,
        );
        return;
      }
    }

    if (
      !isSpecialist &&
      form.departmentId.trim() &&
      !roleMatchesDepartment(
        form.roleKey,
        departments.find((d) => d.id === form.departmentId.trim()) ?? null,
      )
    ) {
      setError('Xodim roli tanlangan bo‘lim roli bilan mos kelishi kerak.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createStaffByRole(role, form);
      toast.success('Xodim qo‘shildi');
      onCreated();
      onOpenChange(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Xatolik';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Xodim qo&apos;shish</DialogTitle>
          <DialogDescription>
            Rol va bo&apos;limni tanlang — kirish faqat shu bo&apos;lim
            kabinetiga ochiladi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Lavozim / rol</Label>
            <Select
              value={form.roleKey}
              onValueChange={(roleKey) =>
                setForm((f) => ({
                  ...f,
                  roleKey,
                  departmentId: '',
                }))
              }>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Rol tanlang" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectGroup>
                  <SelectLabel>Tibbiy</SelectLabel>
                  {clinicalRoles.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Ma&apos;muriy</SelectLabel>
                  {officeRoles.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {!isSpecialist ?
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Bo&apos;lim{needsDepartment ? '' : ' (ixtiyoriy)'}
              </Label>
              <Select
                value={form.departmentId || undefined}
                onValueChange={(departmentId) =>
                  setForm((f) => ({ ...f, departmentId }))
                }>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Bo‘lim tanlang" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {matchingDepartments.length === 0 ?
                    <div className="px-2 py-3 text-xs text-slate-500">
                      Bu rol uchun bo‘lim yo‘q. Avval Dashboard → Bo‘limlar
                      ro‘yxatida shu rolli bo‘lim yarating.
                    </div>
                  : matchingDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          : null}

          {isAdmin ?
            <>
              <div className="space-y-1.5">
                <Label htmlFor="ke-first">Ism</Label>
                <Input
                  id="ke-first"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ke-last">Familiya</Label>
                <Input
                  id="ke-last"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ke-father">Otasining ismi</Label>
                <Input
                  id="ke-father"
                  value={form.fatherName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fatherName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ke-age">Yosh</Label>
                <Input
                  id="ke-age"
                  type="number"
                  min={1}
                  max={120}
                  value={form.age || ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      age: Number.parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
            </>
          : <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ke-fullname">F.I.SH</Label>
              <Input
                id="ke-fullname"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
          }

          <div className="space-y-1.5">
            <Label htmlFor="ke-login">Login</Label>
            <Input
              id="ke-login"
              className="font-mono"
              value={form.login}
              onChange={(e) =>
                setForm((f) => ({ ...f, login: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ke-pass">Parol</Label>
            <Input
              id="ke-pass"
              type="text"
              className="font-mono"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Telefon{isAdmin ? '' : ' (ixtiyoriy)'}</Label>
            <UzPhoneInput
              value={form.phone}
              onChange={(full) => setForm((f) => ({ ...f, phone: full }))}
              className="max-w-none"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}>
            {saving ?
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saqlanmoqda…
              </>
            : 'Saqlash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
