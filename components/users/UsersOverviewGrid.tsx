'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { staffInitials } from '@/components/users/users-staff-ui';
import type {
  KadrlarOverviewSection,
  KadrlarOverviewUser,
} from '@/lib/kadrlar/users-overview';
import { cn } from '@/lib/utils';
import {
  Bandage,
  BriefcaseBusiness,
  ChevronRight,
  CookingPot,
  IdCard,
  Microscope,
  Pencil,
  Pill,
  Search,
  Stethoscope,
  UserRoundCog,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const SECTION_META: Record<
  KadrlarOverviewSection['id'],
  { icon: typeof Stethoscope; accent: string; btn: string }
> = {
  admins: {
    icon: UserRoundCog,
    accent: 'from-slate-600 to-slate-800',
    btn: 'border-slate-200 bg-slate-50 hover:border-slate-400 data-[active=true]:border-slate-600 data-[active=true]:bg-slate-100',
  },
  'office-support': {
    icon: BriefcaseBusiness,
    accent: 'from-amber-500 to-orange-600',
    btn: 'border-amber-200 bg-amber-50/70 hover:border-amber-400 data-[active=true]:border-amber-500 data-[active=true]:bg-amber-100',
  },
  doctors: {
    icon: Stethoscope,
    accent: 'from-violet-600 to-indigo-600',
    btn: 'border-violet-200 bg-violet-50/70 hover:border-violet-400 data-[active=true]:border-violet-500 data-[active=true]:bg-violet-100',
  },
  nurses: {
    icon: Bandage,
    accent: 'from-rose-500 to-pink-600',
    btn: 'border-rose-200 bg-rose-50/70 hover:border-rose-400 data-[active=true]:border-rose-500 data-[active=true]:bg-rose-100',
  },
  laboratory: {
    icon: Microscope,
    accent: 'from-sky-500 to-cyan-600',
    btn: 'border-sky-200 bg-sky-50/70 hover:border-sky-400 data-[active=true]:border-sky-500 data-[active=true]:bg-sky-100',
  },
  reception: {
    icon: IdCard,
    accent: 'from-amber-500 to-orange-600',
    btn: 'border-orange-200 bg-orange-50/70 hover:border-orange-400 data-[active=true]:border-orange-500 data-[active=true]:bg-orange-100',
  },
  pharmacists: {
    icon: Pill,
    accent: 'from-emerald-500 to-teal-600',
    btn: 'border-emerald-200 bg-emerald-50/70 hover:border-emerald-400 data-[active=true]:border-emerald-500 data-[active=true]:bg-emerald-100',
  },
  kitchen: {
    icon: CookingPot,
    accent: 'from-orange-500 to-amber-600',
    btn: 'border-orange-200 bg-orange-50/70 hover:border-orange-400 data-[active=true]:border-orange-500 data-[active=true]:bg-orange-100',
  },
};

function filterUsers(
  users: KadrlarOverviewUser[],
  query: string,
): KadrlarOverviewUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter((user) =>
    [user.fullName, user.position, user.login, user.department ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

type UsersOverviewGridProps = {
  sections: KadrlarOverviewSection[];
  loading: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  subtitle?: string;
  onSectionEdit?: (sectionId: KadrlarOverviewSection['id']) => void;
};

export default function UsersOverviewGrid({
  sections,
  loading,
  query,
  onQueryChange,
  subtitle = 'Bo‘limni tanlang — xodimlar jadvali ochiladi',
  onSectionEdit,
}: UsersOverviewGridProps) {
  const [activeId, setActiveId] = useState<KadrlarOverviewSection['id'] | null>(
    null,
  );

  useEffect(() => {
    if (!sections.length) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) => {
      if (prev && sections.some((s) => s.id === prev)) return prev;
      return sections[0]!.id;
    });
  }, [sections]);

  const filteredSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        users: filterUsers(section.users, query),
      })),
    [sections, query],
  );

  const activeSection = useMemo(
    () => filteredSections.find((s) => s.id === activeId) ?? null,
    [filteredSections, activeId],
  );

  const totalUsers = useMemo(
    () => sections.reduce((sum, section) => sum + section.users.length, 0),
    [sections],
  );

  const visibleUsers = useMemo(
    () =>
      filteredSections.reduce((sum, section) => sum + section.users.length, 0),
    [filteredSections],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Bo‘limlar</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {query.trim() ?
              `${visibleUsers} ta topildi · jami ${totalUsers}`
            : subtitle}
          </p>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Qidirish: ism, lavozim, login..."
            className="rounded-xl border-slate-200 bg-white pl-10 focus-visible:border-violet-400"
          />
        </div>
      </div>

      {loading ?
        <p className="rounded-2xl border border-slate-100 bg-white py-16 text-center text-sm text-slate-500">
          Xodimlar yuklanmoqda…
        </p>
      : <>
          <div className="flex flex-wrap gap-2">
            {filteredSections.map((section) => {
              const meta = SECTION_META[section.id];
              const Icon = meta.icon;
              const active = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  data-active={active}
                  onClick={() => setActiveId(section.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm transition',
                    meta.btn,
                    active && 'shadow-md ring-2 ring-violet-300/60',
                  )}>
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br text-white',
                      meta.accent,
                    )}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate leading-tight">
                      {section.title}
                    </span>
                    <span className="block text-[11px] font-normal text-slate-500">
                      {section.users.length} ta xodim
                    </span>
                  </span>
                  <ChevronRight
                    className={cn(
                      'size-4 shrink-0 text-slate-400 transition',
                      active && 'rotate-90 text-violet-600',
                    )}
                  />
                </button>
              );
            })}
          </div>

          {activeSection ?
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {(() => {
                    const meta = SECTION_META[activeSection.id];
                    const Icon = meta.icon;
                    return (
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
                          meta.accent,
                        )}>
                        <Icon className="size-5" />
                      </span>
                    );
                  })()}
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900">
                      {activeSection.title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {activeSection.users.length} ta xodim
                    </p>
                  </div>
                </div>
                {onSectionEdit ?
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-lg"
                    onClick={() => onSectionEdit(activeSection.id)}>
                    <Pencil className="size-3.5" />
                    Bo‘limda tahrirlash
                  </Button>
                : null}
              </div>

              {activeSection.users.length === 0 ?
                <p className="px-4 py-12 text-center text-sm text-slate-500">
                  Bu bo‘limda hozircha xodim yo‘q
                </p>
              : <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="min-w-55 text-xs font-semibold text-slate-500">
                          F.I.Sh
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">
                          Lavozim / bo‘lim
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-slate-500">
                          Login
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSection.users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="border-slate-50 hover:bg-violet-50/40">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[10px] font-bold text-violet-700">
                                {staffInitials(user.fullName)}
                              </span>
                              <span className="font-medium whitespace-normal text-slate-800">
                                {user.fullName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                                {user.position}
                              </span>
                              {user.department ?
                                <p className="text-xs text-slate-500">
                                  {user.department}
                                </p>
                              : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.login ?
                              <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                                {user.login}
                              </code>
                            : <span className="text-slate-400">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              }
            </div>
          : <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
              Bo‘limni tanlang
            </p>
          }
        </>
      }
    </section>
  );
}

export function useUsersOverviewTotal(sections: KadrlarOverviewSection[]) {
  return useMemo(
    () => sections.reduce((sum, section) => sum + section.users.length, 0),
    [sections],
  );
}
