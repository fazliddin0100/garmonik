'use client';

import { Input } from '@/components/ui/input';
import { staffInitials } from '@/components/users/users-staff-ui';
import type {
  KadrlarOverviewSection,
  KadrlarOverviewUser,
} from '@/lib/kadrlar/users-overview';
import { cn } from '@/lib/utils';
import {
  Bandage,
  IdCard,
  Microscope,
  Pill,
  Search,
  Stethoscope,
  UserRoundCog,
} from 'lucide-react';
import { useMemo } from 'react';

const SECTION_META: Record<
  KadrlarOverviewSection['id'],
  { icon: typeof Stethoscope; accent: string }
> = {
  admins: { icon: UserRoundCog, accent: 'from-slate-600 to-slate-800' },
  doctors: { icon: Stethoscope, accent: 'from-violet-600 to-indigo-600' },
  nurses: { icon: Bandage, accent: 'from-rose-500 to-pink-600' },
  laboratory: { icon: Microscope, accent: 'from-sky-500 to-cyan-600' },
  reception: { icon: IdCard, accent: 'from-amber-500 to-orange-600' },
  pharmacists: { icon: Pill, accent: 'from-emerald-500 to-teal-600' },
};

function filterUsers(
  users: KadrlarOverviewUser[],
  query: string,
): KadrlarOverviewUser[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter((user) =>
    [user.fullName, user.position, user.login]
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

function SectionColumn({
  section,
  users,
}: {
  section: KadrlarOverviewSection;
  users: KadrlarOverviewUser[];
}) {
  const meta = SECTION_META[section.id];
  const Icon = meta.icon;

  return (
    <article className="flex min-h-72 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <header className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-sm',
              meta.accent,
            )}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">{section.title}</h3>
            <p className="text-xs text-slate-500">{users.length} ta xodim</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {users.length === 0 ?
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Hozircha xodim yo‘q
          </p>
        : <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-white/95 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2.5">F.I.Sh</th>
                <th className="px-4 py-2.5">Lavozim</th>
                <th className="px-4 py-2.5">Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-50 transition-colors last:border-0 hover:bg-violet-50/40">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[10px] font-bold text-violet-700">
                        {staffInitials(user.fullName)}
                      </span>
                      <span className="font-medium whitespace-normal text-slate-800">
                        {user.fullName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                      {user.position}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {user.login ?
                      <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                        {user.login}
                      </code>
                    : <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </article>
  );
}

type UsersOverviewGridProps = {
  sections: KadrlarOverviewSection[];
  loading: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  subtitle?: string;
};

export default function UsersOverviewGrid({
  sections,
  loading,
  query,
  onQueryChange,
  subtitle = 'Administratorlar, shifokorlar, hamshiralar va boshqa xodimlar',
}: UsersOverviewGridProps) {
  const filteredSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        users: filterUsers(section.users, query),
      })),
    [sections, query],
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
    <section className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg backdrop-blur md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Bo‘limlar bo‘yicha
          </h3>
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
            className="rounded-xl border-slate-200 bg-slate-50/80 pl-10 focus-visible:border-violet-400 focus-visible:bg-white"
          />
        </div>
      </div>

      {loading ?
        <p className="py-16 text-center text-sm text-slate-500">
          Xodimlar yuklanmoqda…
        </p>
      : <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredSections.map((section) => (
            <SectionColumn
              key={section.id}
              section={section}
              users={section.users}
            />
          ))}
        </div>
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
