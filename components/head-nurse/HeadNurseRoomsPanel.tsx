'use client';

import type { HeadNurseData } from '@/components/head-nurse/useHeadNurseData';
import RoomBedGrid from '@/components/rooms/RoomBedGrid';
import { Users } from 'lucide-react';

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
      </p>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm">
        Jami: <strong>{totalOcc}</strong> / {totalCap} o‘rin band ·{' '}
        <strong>{totalCap - totalOcc}</strong> bo‘sh
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {data.rooms.map((room) => {
          const free = Math.max(0, room.capacity - room.occupied);
          const pct = room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;

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
