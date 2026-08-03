'use client';

import { useStaffPortalViewOptional } from '@/components/staff/StaffPortalViewContext';
import { STAFF_ROLE_LABELS, type StaffRole } from '@/lib/staff-portal/types';
import {
  STAFF_PORTAL_VIEW_META,
  type StaffPortalViewId,
} from '@/lib/staff-portal/views';
import {
  ArrowRight,
  ClipboardList,
  FileBarChart2,
  FlaskConical,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';

type StaffRoleDashboardProps = {
  role: StaffRole;
  intro: string;
};

const accent: Record<StaffRole, string> = {
  doctor: 'from-violet-600 to-indigo-600',
  shifokor: 'from-violet-600 to-indigo-600',
  laboratory: 'from-cyan-600 to-teal-600',
  nurse: 'from-rose-500 to-orange-500',
  head_nurse: 'from-rose-600 to-pink-600',
  kabinet: 'from-sky-600 to-blue-700',
  specialist: 'from-violet-600 to-indigo-600',
  farmatsevt: 'from-emerald-600 to-teal-600',
  oshpaz: 'from-orange-500 to-amber-600',
};

type DashCard = {
  view: StaffPortalViewId;
  title: string;
  desc: string;
  icon: typeof UserRound;
  hidden?: boolean;
};

export default function StaffRoleDashboard({ role, intro }: StaffRoleDashboardProps) {
  const portalNav = useStaffPortalViewOptional();
  const base = portalNav?.basePath ?? `/doctor`;

  const cards: DashCard[] = [
    {
      view: 'bemorlar',
      title: 'Bemorlar',
      desc:
        role === 'laboratory' ?
          'To‘langan bemorlar va tahlil natijalari'
        : 'Kartoteka va qidiruv',
      icon: UserRound,
      hidden: portalNav ? !portalNav.showPatientsNav : false,
    },
    {
      view: 'navbat',
      title: 'Navbat',
      desc: 'Jonli navbat ro‘yxati',
      icon: ClipboardList,
      hidden: portalNav ? !portalNav.showQueueNav : false,
    },
    {
      view: 'xizmatlar',
      title: role === 'laboratory' ? 'Tahlillar narxlari' : 'Xizmatlar katalogi',
      desc: 'Narxlar va kodlar',
      icon: FlaskConical,
      hidden: portalNav ? !portalNav.showServicesNav : false,
    },
    {
      view: 'hisobotlar',
      title: 'Hisobotlar',
      desc: 'Tushum va xarajatlar',
      icon: FileBarChart2,
    },
  ].filter((c) => !c.hidden);

  return (
    <div className="space-y-6">
      <div
        className={`rounded-3xl bg-linear-to-br ${accent[role]} p-6 text-white shadow-xl shadow-violet-500/20 md:p-8`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          {STAFF_ROLE_LABELS[role]} kabineti
        </p>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl">Xush kelibsiz</h2>
        <p className="mt-3 text-sm leading-relaxed text-white/90 md:text-base">{intro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const className =
            'group flex flex-col rounded-2xl border border-white/70 bg-white/85 p-5 shadow-lg backdrop-blur transition hover:border-violet-200 hover:shadow-violet-200/40 text-left w-full';
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Icon className="size-5" />
                </span>
                <ArrowRight className="size-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
            </>
          );
          if (portalNav) {
            return (
              <button
                key={c.view}
                type="button"
                className={className}
                onClick={() => portalNav.openView(c.view)}>
                {inner}
              </button>
            );
          }
          return (
            <Link
              key={c.view}
              href={`${base}${STAFF_PORTAL_VIEW_META[c.view].segment ? `/${STAFF_PORTAL_VIEW_META[c.view].segment}` : ''}`}
              className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
