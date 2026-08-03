'use client';

import {
  Bandage,
  Briefcase,
  IdCard,
  Microscope,
  Pill,
  Stethoscope,
  UserRoundCog,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { usePortalNavOptional } from '@/components/portal/PortalNavContext';
import { usersViewPath, type UsersViewId } from '@/lib/users/views';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const sections: {
  view: UsersViewId | 'kadrlar';
  label: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  {
    view: 'admins',
    label: 'Administratorlar',
    desc: 'Tizim administratorlari',
    icon: UserRoundCog,
  },
  {
    view: 'doctors',
    label: 'Shifokorlar',
    desc: 'Mutaxassislar ro‘yxati',
    icon: Stethoscope,
  },
  {
    view: 'nurses',
    label: 'Hamshiralar',
    desc: 'Hamshira xodimlari',
    icon: Bandage,
  },
  {
    view: 'laboratory',
    label: 'Laboratoriya xodimlari',
    desc: 'Lab xodimlari',
    icon: Microscope,
  },
  {
    view: 'reception',
    label: 'Qabul xodimlari',
    desc: 'Registratura',
    icon: IdCard,
  },
  {
    view: 'pharmacists',
    label: 'Farmatsevtlar',
    desc: 'Dorixona',
    icon: Pill,
  },
  {
    view: 'staff',
    label: 'Boshqa xodimlar',
    desc: 'Umumiy ro‘yxat',
    icon: UserRoundPlus,
  },
  {
    view: 'kadrlar',
    label: 'Kadrlar bo‘limi',
    desc: 'Login va parollar',
    icon: Briefcase,
  },
];

export default function UsersHubPanel() {
  const portalNav = usePortalNavOptional();
  const router = useRouter();

  function openView(view: UsersViewId) {
    if (portalNav) {
      portalNav.openUsersView(view);
      return;
    }
    router.push(usersViewPath(view));
  }

  return (
    <div className="space-y-6 mt-3">
      <section className="rounded-3xl border border-violet-200/50 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/40 p-6 shadow-xl shadow-violet-200/25 backdrop-blur md:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
            <UserRoundPlus className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600/90">
              Xodimlar markazi
            </p>
            <h2 className="mt-1.5 text-2xl font-bold text-slate-900">Xodimlar</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Kerakli xodimlar bo‘limini tanlang — jadval va qo‘shish oynalari bir
              xil dizaynda.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((s) => {
          const Icon = s.icon;
          const cardClass =
            'group rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/60';
          if (s.view === 'kadrlar') {
            return (
              <Link key={s.view} href="/kadrlar" className={cardClass}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-3 font-semibold text-slate-900">{s.label}</h2>
                <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
              </Link>
            );
          }
          return (
            <button
              key={s.view}
              type="button"
              onClick={() => {
                if (s.view !== 'kadrlar') openView(s.view);
              }}
              className={`${cardClass} text-left`}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-3 font-semibold text-slate-900">{s.label}</h2>
              <p className="mt-1 text-xs text-slate-500">{s.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
