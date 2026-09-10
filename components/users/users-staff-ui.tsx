'use client';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { useClinicDepartments } from '@/hooks/useClinicDepartments';
import { cn } from '@/lib/utils';
import {
  ArrowUpDown,
  Building2,
  Check,
  Ellipsis,
  Eye,
  EyeOff,
  Lock,
  Plus,
  Search as SearchIcon,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

export const USERS_STAFF_FIELD_CLASS =
  'h-11 rounded-xl border-slate-200 bg-slate-50/80 transition focus-visible:border-violet-400 focus-visible:bg-white';

export type UsersStaffSortState<T extends string> = {
  key: T;
  direction: 'asc' | 'desc';
};

export function staffInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function UsersStaffHero({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  addLabel,
  onAdd,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <section className="rounded-3xl border border-violet-200/50 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/40 p-6 shadow-xl shadow-violet-200/25 backdrop-blur md:p-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
            <Icon className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">
              {eyebrow}
            </p>
            <h2 className="mt-1.5 text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>
          </div>
        </div>
        <Button
          type="button"
          className="rounded-xl bg-violet-600 hover:bg-violet-700"
          onClick={onAdd}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </div>
    </section>
  );
}

export function UsersStaffTableSection({
  title,
  filteredCount,
  totalCount,
  query,
  onQueryChange,
  searchPlaceholder,
  children,
}: {
  title: string;
  filteredCount: number;
  totalCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {filteredCount === totalCount ?
              `${totalCount} ta yozuv`
            : `${filteredCount} ta topildi · jami ${totalCount}`}
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="rounded-xl border-slate-200 bg-slate-50/80 pl-10 focus-visible:border-violet-400 focus-visible:bg-white"
          />
        </div>
      </div>
      <div className="max-h-[68vh] overflow-auto rounded-2xl border border-slate-100">
        {children}
      </div>
    </section>
  );
}

export function UsersSortableHead<T extends string>({
  title,
  sortKey,
  sort,
  className,
  onSort,
}: {
  title: string;
  sortKey: T;
  sort: UsersStaffSortState<T>;
  className?: string;
  onSort: (key: T) => void;
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

export function UsersStaffNameCell({ fullName }: { fullName: string }) {
  return (
    <TableCell>
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-100 to-indigo-100 text-xs font-bold text-violet-700">
          {staffInitials(fullName)}
        </span>
        <span className="font-medium whitespace-normal text-slate-800">
          {fullName}
        </span>
      </div>
    </TableCell>
  );
}

export function UsersStaffSpecialtyBadge({ specialty }: { specialty?: string }) {
  return (
    <TableCell>
      {specialty ?
        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-800">
          {specialty}
        </span>
      : <span className="text-slate-400">—</span>}
    </TableCell>
  );
}

export function UsersStaffDepartmentCell({ department }: { department?: string }) {
  const { labelFor } = useClinicDepartments();
  const title = labelFor(department) || department?.trim() || '';
  return (
    <TableCell>
      {title ?
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <Building2 className="size-3.5 shrink-0 text-violet-500" />
          <span className="whitespace-normal">{title}</span>
        </span>
      : <span className="text-slate-400">—</span>}
    </TableCell>
  );
}

/** Bo‘limlar katalogidan select (saqlanadi: dep-grp-… id) */
export function UsersStaffDepartmentSelect({
  value,
  onChange,
  roleKey,
  className,
  optional = false,
}: {
  value: string;
  onChange: (departmentId: string) => void;
  /** Masalan `laboratory` — faqat shu rolli bo‘limlar. Bo‘sh bo‘lsa Dashboard → Bo‘limlar ro‘yxati. */
  roleKey?: string;
  className?: string;
  optional?: boolean;
}) {
  const { departments, forRoleKey, loading } = useClinicDepartments();
  const options = roleKey ? forRoleKey(roleKey) : departments;

  return (
    <Select
      value={value || undefined}
      onValueChange={onChange}
      disabled={loading}>
      <SelectTrigger className={cn('w-full rounded-xl', className)}>
        <SelectValue
          placeholder={
            loading ? 'Yuklanmoqda…'
            : optional ? 'Bo‘lim (ixtiyoriy)'
            : 'Bo‘lim tanlang'
          }
        />
      </SelectTrigger>
      <SelectContent position="popper" className="z-[200] max-h-72">
        {options.length === 0 ?
          <div className="px-2 py-3 text-xs text-slate-500">
            Mos bo‘lim yo‘q. Avval Dashboard → Bo‘limlar ro‘yxatida yarating.
          </div>
        : options.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.title}
            </SelectItem>
          ))
        }
      </SelectContent>
    </Select>
  );
}

export function UsersStaffLoginCode({ login }: { login?: string }) {
  return (
    <TableCell>
      {login ?
        <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
          {login}
        </code>
      : <span className="text-slate-400">—</span>}
    </TableCell>
  );
}

export function UsersStaffStatusCell({ active }: { active?: boolean }) {
  return (
    <TableCell className="text-center">
      {active ?
        <Check className="mx-auto size-4 text-emerald-600" />
      : <X className="mx-auto size-4 text-amber-500" />}
    </TableCell>
  );
}

export function UsersStaffActionsCell({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
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
          <DropdownMenuItem onClick={onEdit}>Tahrirlash</DropdownMenuItem>
          <DropdownMenuItem
            className="text-rose-600 focus:text-rose-600"
            onClick={onDelete}>
            O‘chirish
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  );
}

export function UsersStaffEmptyRow({
  colSpan,
  icon: Icon,
  title,
  description,
  addLabel,
  onAdd,
  loading,
  loadingText = 'Yuklanmoqda…',
}: {
  colSpan: number;
  icon: LucideIcon;
  title: string;
  description: string;
  addLabel?: string;
  onAdd?: () => void;
  loading?: boolean;
  loadingText?: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-16 text-center">
        {loading ?
          <p className="text-sm text-slate-500">{loadingText}</p>
        : <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Icon className="size-7" />
            </span>
            <p className="font-medium text-slate-700">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
            {addLabel && onAdd ?
              <Button
                type="button"
                size="sm"
                className="mt-1 rounded-xl bg-violet-600 hover:bg-violet-700"
                onClick={onAdd}>
                <Plus className="size-4" />
                {addLabel}
              </Button>
            : null}
          </div>
        }
      </TableCell>
    </TableRow>
  );
}

export function UsersStaffFormDialog({
  open,
  onOpenChange,
  editing,
  icon: Icon,
  createTitle,
  editTitle,
  createDescription,
  editDescription,
  saving,
  saveLabel = 'Saqlash',
  createSaveLabel,
  onSave,
  error,
  hint,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  icon: LucideIcon;
  createTitle: string;
  editTitle: string;
  createDescription: string;
  editDescription: string;
  saving?: boolean;
  saveLabel?: string;
  createSaveLabel?: string;
  onSave: () => void;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-[520px]">
        <div className="relative max-h-[min(90vh,720px)] overflow-hidden rounded-3xl border border-violet-200/60 bg-white shadow-2xl shadow-violet-900/10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-violet-500/20 via-indigo-500/8 to-transparent" />
          <div className="relative max-h-[min(90vh,720px)] overflow-y-auto p-6 sm:p-8">
            <div className="mb-6 flex items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/35">
                <Icon className="size-7" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                  {editing ? editTitle : createTitle}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {editing ? editDescription : createDescription}
                </DialogDescription>
              </div>
            </div>

            <div className="space-y-5">{children}</div>

            {hint}

            {error ?
              <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {error}
              </p>
            : null}

            <DialogFooter className="mt-8 flex-col gap-2 border-t border-slate-100/80 pt-6 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-slate-200"
                disabled={saving}
                onClick={() => onOpenChange(false)}>
                Bekor qilish
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 hover:from-violet-700 hover:to-indigo-700"
                disabled={saving}
                onClick={onSave}>
                {saving ?
                  'Saqlanmoqda…'
                : editing ?
                  saveLabel
                : createSaveLabel ?? saveLabel}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function UsersStaffFormSection({
  title,
  icon: Icon,
  variant = 'neutral',
  children,
}: {
  title: string;
  icon: LucideIcon;
  variant?: 'neutral' | 'violet';
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border p-4',
        variant === 'violet' ?
          'border-violet-100 bg-violet-50/35'
        : 'border-slate-100 bg-slate-50/50',
      )}>
      <p
        className={cn(
          'mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]',
          variant === 'violet' ? 'text-violet-700/80' : 'text-slate-500',
        )}>
        <Icon className="size-3.5 text-violet-600" />
        {title}
      </p>
      {children}
    </section>
  );
}

export function UsersStaffPasswordField({
  id,
  value,
  onChange,
  editing,
  showPassword,
  onToggleShow,
  onGenerate,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  showPassword: boolean;
  onToggleShow: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-slate-700">
        <Lock className="size-4 text-violet-600" />
        {editing ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
      </Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id={id}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={cn(USERS_STAFF_FIELD_CLASS, 'pl-10 pr-11 font-mono')}
            placeholder={
              editing ?
                'O‘zgartirmaslik uchun bo‘sh qoldiring'
              : 'Kamida 6 belgi'
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-9 -translate-y-1/2 rounded-lg text-slate-500 hover:bg-violet-50 hover:text-violet-700"
            title={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
            onClick={onToggleShow}>
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
          onClick={onGenerate}>
          <Sparkles className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function UsersStaffPortalHint({ path }: { path: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-900">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-600" />
      <p>
        Saqlangandan so‘ng xodim{' '}
        <span className="font-medium">{path}</span> kabinetiga login va parol
        bilan kira oladi.
      </p>
    </div>
  );
}

export function UsersStaffFieldLabel({
  htmlFor,
  icon: Icon,
  children,
}: {
  htmlFor?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-2 text-slate-700">
      {Icon ?
        <Icon className="size-4 text-violet-600" />
      : null}
      {children}
    </Label>
  );
}
