'use client';

import { Button } from '@/components/ui/button';
import { useHeadNurseView } from '@/components/head-nurse/HeadNurseViewContext';
import type { HeadNurseData } from '@/components/head-nurse/useHeadNurseData';
import { ArrowRight, BedDouble, ClipboardList, HeartPulse, Hospital } from 'lucide-react';

export default function HeadNurseDashboard({ data }: { data: HeadNurseData }) {
  const { setView } = useHeadNurseView();
  const freeBeds = data.rooms.reduce(
    (sum, r) => sum + Math.max(0, r.capacity - r.occupied),
    0,
  );

  const cards = [
    {
      view: 'yotqizish' as const,
      title: 'Yotqizish navbati',
      desc: 'Shifokor yuborgan bemorlarni palataga joylashtirish',
      count: data.pendingPatients.length,
      icon: ClipboardList,
      accent: 'from-amber-500 to-orange-500',
    },
    {
      view: 'statsionar' as const,
      title: 'Statsionar bemorlar',
      desc: 'Kunlik ko‘riq va natijalarni yozib borish',
      count: data.activeAdmissions.length,
      icon: Hospital,
      accent: 'from-rose-500 to-pink-600',
    },
    {
      view: 'kuzatuv' as const,
      title: 'Uyga kuzatuv',
      desc: 'Chiqarilgan bemorlarni uyidan kuzatish',
      count: data.monitoringAdmissions.length,
      icon: HeartPulse,
      accent: 'from-violet-500 to-indigo-600',
    },
    {
      view: 'xonalar' as const,
      title: 'Xonalar',
      desc: 'Palatalar bandligi va bo‘sh o‘rinlar',
      count: freeBeds,
      countLabel: 'bo‘sh o‘rin',
      icon: BedDouble,
      accent: 'from-emerald-500 to-teal-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-linear-to-br from-rose-600 to-pink-600 p-6 text-white shadow-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
          Bosh hamshira kabineti
        </p>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl">Statsionar va kuzatuv markazi</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90">
          Shifokor tahlil natijalarini ko‘rib klinikaga yotqizishga yuborgan bemorlarni qabul
          qiling, palataga joylashtiring, kunlik ko‘riq natijalarini yozib boring va uyga
          kuzatuvni boshqaring.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.view}
              type="button"
              onClick={() => setView(c.view)}
              className="group flex flex-col rounded-2xl border border-white/70 bg-white/85 p-5 text-left shadow-lg backdrop-blur transition hover:border-rose-200 hover:shadow-rose-200/40">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br ${c.accent} text-white shadow-sm`}>
                  <Icon className="size-5" />
                </span>
                <ArrowRight className="size-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-rose-600" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
              <p className="mt-3 text-2xl font-bold text-slate-800">
                {c.count}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {c.countLabel ?? 'ta'}
                </span>
              </p>
            </button>
          );
        })}
      </div>

      {data.pendingPatients.length > 0 ?
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-sm font-medium text-amber-900">
            {data.pendingPatients.length} ta bemor yotqizishni kutmoqda
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-2 bg-amber-600 hover:bg-amber-700"
            onClick={() => setView('yotqizish')}>
            Yotqizish bo‘limiga o‘tish
          </Button>
        </div>
      : null}
    </div>
  );
}
