'use client';

import KadrlarEmployeeProfileDialog from '@/components/kadrlar/KadrlarEmployeeProfileDialog';
import {
  departmentAccentForRole,
  departmentIconForRole,
} from '@/lib/clinic-departments/department-icons';
import { departmentRoleLabel } from '@/lib/clinic-departments/roles';
import type { DepartmentGroup } from '@/lib/clinic-departments/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { KadrlarDepartmentUser } from '@/lib/kadrlar/department-users';
import { formatBirthDateForDisplay } from '@/lib/patients/birth-display';
import { cn } from '@/lib/utils';
import { Building2, ExternalLink, FileText, Pencil, Users } from 'lucide-react';
import { startTransition, useCallback, useEffect, useState } from 'react';

export default function KadrlarEmployeesListPage() {
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [departmentUsers, setDepartmentUsers] = useState<KadrlarDepartmentUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUser, setEditUser] = useState<KadrlarDepartmentUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await fetch('/api/kadrlar/departments', {
        credentials: 'include',
      });
      if (!res.ok) {
        setDepartments([]);
        return;
      }
      const data = (await res.json()) as { departments?: DepartmentGroup[] };
      const list = Array.isArray(data.departments) ? data.departments : [];
      setDepartments(list);
      setSelectedId((prev) => {
        if (prev && list.some((row) => row.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartmentUsers = useCallback(async (departmentId: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch(
        `/api/kadrlar/department-users?departmentId=${encodeURIComponent(departmentId)}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        setDepartmentUsers([]);
        return;
      }
      const data = (await res.json()) as { users?: KadrlarDepartmentUser[] };
      setDepartmentUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setDepartmentUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      startTransition(() => {
        void (async () => {
          if (cancelled) return;
          await loadDepartments();
        })();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [loadDepartments]);

  useEffect(() => {
    if (!selectedId) {
      setDepartmentUsers([]);
      return;
    }
    void loadDepartmentUsers(selectedId);
  }, [selectedId, loadDepartmentUsers]);

  const selected = departments.find((row) => row.id === selectedId) ?? null;

  function openEdit(user: KadrlarDepartmentUser) {
    setEditUser(user);
    setDialogOpen(true);
  }

  function handleSaved() {
    if (selectedId) void loadDepartmentUsers(selectedId);
  }

  return (
    <div className="mt-3 space-y-6">
      <section className="rounded-3xl border border-violet-200/50 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/40 p-6 shadow-xl shadow-violet-200/25 backdrop-blur md:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
            <Users className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">
              Kadrlar bo‘limi
            </p>
            <h1 className="mt-1.5 text-2xl font-bold text-slate-900">
              Xodimlar ro‘yxati
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {loading ?
                'Yuklanmoqda…'
              : `${departments.length} ta bo‘lim · Bazadan ism, familiya, tug‘ilgan yili va faoliyat`}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-violet-600" />
          <h2 className="text-lg font-semibold text-slate-900">Bo‘limlar</h2>
        </div>
        <p className="text-sm text-slate-500">
          Bo‘limni tanlang — xodimlar ro‘yxati, tahrirlash va obyektivka pastda
          ko‘rsatiladi.
        </p>

        {loading ?
          <p className="rounded-2xl border border-slate-100 bg-white py-14 text-center text-sm text-slate-500">
            Bo‘limlar yuklanmoqda…
          </p>
        : departments.length === 0 ?
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
            Hali bo‘lim qo‘shilmagan. Dashboard → Bo‘limlar ro‘yxatida yarating.
          </p>
        : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {departments.map((department) => {
              const Icon = departmentIconForRole(department.roleKey);
              const accent = departmentAccentForRole(department.roleKey);
              const active = department.id === selectedId;
              return (
                <button
                  key={department.id}
                  type="button"
                  data-active={active}
                  onClick={() => setSelectedId(department.id)}
                  className={cn(
                    'group rounded-2xl border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                    accent.soft,
                    active && cn('ring-2 shadow-md', accent.ring),
                  )}>
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm transition-transform group-hover:scale-105',
                        accent.gradient,
                      )}>
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight text-slate-900">
                        {department.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-violet-700">
                        {departmentRoleLabel(department.roleKey || null)}
                      </p>
                      {department.description ?
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {department.description}
                        </p>
                      : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        }
      </section>

      {selected ?
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
            <h3 className="text-base font-semibold text-slate-900">
              {selected.title} — xodimlar
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Rol: {departmentRoleLabel(selected.roleKey || null)}
              {!usersLoading ?
                ` · ${departmentUsers.length} ta xodim`
              : ''}
            </p>
          </div>

          {usersLoading ?
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              Xodimlar yuklanmoqda…
            </p>
          : departmentUsers.length === 0 ?
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              Bu bo‘lim uchun xodim topilmadi. Xodimlarni /users sahifasida
              bo‘limga biriktiring.
            </p>
          : <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-slate-500">
                      Ism
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">
                      Familiya
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">
                      Tug‘ilgan sana
                    </TableHead>
                    <TableHead className="min-w-40 text-xs font-semibold text-slate-500">
                      Manzil
                    </TableHead>
                    <TableHead className="min-w-45 text-xs font-semibold text-slate-500">
                      Ish faoliyati
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500">
                      Obyektivka
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-slate-500">
                      Amallar
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentUsers.map((user) => (
                    <TableRow
                      key={`${user.staffKind}:${user.id}`}
                      className="border-slate-50 hover:bg-violet-50/40">
                      <TableCell className="font-medium text-slate-800">
                        {user.firstName || '—'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {user.lastName || '—'}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {formatBirthDateForDisplay(
                          user.birthDate,
                          user.birthYear,
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-2 text-sm text-slate-600">
                          {user.address || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="line-clamp-2 text-sm text-slate-600">
                          {user.activityDirection || user.position || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.objektivkaPath ?
                          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                            <a
                              href={user.objektivkaPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={user.objektivkaFileName || 'Obyektivka'}>
                              <FileText className="mr-1 size-3.5 text-violet-600" />
                              <span className="max-w-24 truncate text-xs">
                                {user.objektivkaFileName || 'Ochish'}
                              </span>
                              <ExternalLink className="ml-1 size-3 text-slate-400" />
                            </a>
                          </Button>
                        : <span className="text-xs text-slate-400">Yo‘q</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={() => openEdit(user)}>
                          <Pencil className="mr-1.5 size-3.5" />
                          Tahrirlash
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          }
        </section>
      : null}

      <KadrlarEmployeeProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editUser}
        onSaved={handleSaved}
      />
    </div>
  );
}
