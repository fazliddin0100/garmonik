'use client';

import type { HeadNurseData } from '@/components/head-nurse/useHeadNurseData';
import RoomBedGrid from '@/components/rooms/RoomBedGrid';
import { roomOccupancyGenderSummary } from '@/lib/inpatient/gender';
import { cn } from '@/lib/utils';
import { Users, VenusAndMars } from 'lucide-react';

export default function HeadNurseRoomsPanel({ data }: { data: HeadNurseData }) {
  if (data.loading) {
    return <p className="text-sm text-slate-500">Yuklanmoqda…</p>;
  }

  const totalCap = data.rooms.reduce((s, r) => s + r.capacity, 0);
  const totalOcc = data.rooms.reduce((s, r) => s + r.occupied, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Palatalar bandligi yotqizilgan bemorlar soniga qarab avtomatik yangilanadi.
        Band karavotlarda bemor jinsi ko‘rsatiladi.
      </p>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm">
        Jami: <strong>{totalOcc}</strong> / {totalCap} o‘rin band ·{' '}
        <strong>{totalCap - totalOcc}</strong> bo‘sh
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 font-medium text-sky-800 ring-1 ring-sky-200">
          <span className="size-2 rounded-full bg-sky-500" />
          Erkak
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-800 ring-1 ring-rose-200">
          <span className="size-2 rounded-full bg-rose-500" />
          Ayol
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">
          <span className="size-2 rounded-full bg-emerald-500" />
          Bo‘sh
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.rooms.map((room) => {
          const free = Math.max(0, room.capacity - room.occupied);
          const pct =
            room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;
          const genderSummary = roomOccupancyGenderSummary(
            room.id,
            data.admissions,
            room.capacity,
          );

          return (
            <article
              key={room.id}
              className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{room.name}</h3>
                  <p className="text-xs text-slate-500">{room.kind}</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-sm">
                  <Users className="size-4 text-rose-500" />
                  {room.occupied}/{room.capacity}
                </div>
              </div>
              <div className="mt-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                    genderSummary.kind === 'empty' &&
                      'bg-emerald-50 text-emerald-800 ring-emerald-200',
                    genderSummary.kind === 'male' &&
                      'bg-sky-50 text-sky-800 ring-sky-200',
                    genderSummary.kind === 'female' &&
                      'bg-rose-50 text-rose-800 ring-rose-200',
                    genderSummary.kind === 'mixed' &&
                      'bg-amber-50 text-amber-900 ring-amber-200',
                    genderSummary.kind === 'unknown' &&
                      'bg-slate-100 text-slate-600 ring-slate-200',
                  )}>
                  <VenusAndMars className="size-3" />
                  {genderSummary.label}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-linear-to-r from-rose-500 to-pink-600 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-emerald-700">{free} ta bo‘sh o‘rin</p>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <RoomBedGrid
                  room={room}
                  admissions={data.admissions}
                  mode="view"
                  size="sm"
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
