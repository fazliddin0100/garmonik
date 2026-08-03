'use client';

import type { ClinicRoom } from '@/lib/clinic-rooms/types';
import type { InpatientAdmission } from '@/lib/inpatient/types';
import {
  bedLabelForIndex,
  getBedOccupancyMap,
} from '@/lib/inpatient/room-beds';
import { cn } from '@/lib/utils';

const OCCUPIED_GRADIENTS = [
  'from-rose-500 to-rose-700',
  'from-violet-500 to-violet-700',
  'from-fuchsia-500 to-fuchsia-700',
  'from-pink-500 to-pink-700',
] as const;

function BedIcon({ occupied, selected }: { occupied: boolean; selected: boolean }) {
  return (
    <svg
      viewBox="0 0 72 52"
      className={cn(
        'h-11 w-[4.5rem] drop-shadow-sm transition-transform',
        selected && 'scale-105',
        !occupied && 'group-hover:scale-[1.03]',
      )}
      aria-hidden>
      <rect x="8" y="42" width="4" height="8" rx="1" fill="currentColor" opacity="0.35" />
      <rect x="60" y="42" width="4" height="8" rx="1" fill="currentColor" opacity="0.35" />
      <rect
        x="6"
        y="22"
        width="60"
        height="20"
        rx="4"
        fill="currentColor"
        opacity={occupied ? 0.95 : 0.55}
      />
      <rect
        x="10"
        y="14"
        width="18"
        height="12"
        rx="3"
        fill="white"
        opacity={occupied ? 0.92 : 0.85}
      />
      <rect
        x="4"
        y="18"
        width="8"
        height="24"
        rx="2"
        fill="currentColor"
        opacity={occupied ? 0.75 : 0.45}
      />
      <line
        x1="12"
        y1="20"
        x2="26"
        y2="20"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.25"
      />
    </svg>
  );
}

type RoomBedGridProps = {
  room: ClinicRoom;
  admissions: InpatientAdmission[];
  mode?: 'view' | 'select';
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
  size?: 'sm' | 'md';
  className?: string;
};

export default function RoomBedGrid({
  room,
  admissions,
  mode = 'view',
  selectedIndex = null,
  onSelect,
  size = 'md',
  className,
}: RoomBedGridProps) {
  const occupancy = getBedOccupancyMap(room.id, admissions, room.capacity);
  const selectable = mode === 'select';

  return (
    <div
      className={cn(
        'flex flex-wrap',
        size === 'sm' ? 'gap-2' : 'gap-3',
        className,
      )}
      role={selectable ? 'listbox' : 'group'}
      aria-label={`${room.name} karavotlari`}>
      {Array.from({ length: room.capacity }, (_, index) => {
        const admission = occupancy.get(index);
        const occupied = Boolean(admission);
        const isSelected = selectedIndex === index;
        const label = bedLabelForIndex(index);
        const gradientClass = OCCUPIED_GRADIENTS[index % OCCUPIED_GRADIENTS.length];

        const content = (
          <>
            <div
              className={cn(
                'relative flex items-center justify-center rounded-xl border-2 p-2 transition-all',
                occupied ?
                  cn(
                    'border-transparent bg-linear-to-br text-white shadow-md',
                    gradientClass,
                    isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-rose-600',
                  )
                : isSelected ?
                  'border-rose-500 bg-emerald-100 text-emerald-700 ring-2 ring-rose-400 ring-offset-2'
                : 'border-emerald-300 bg-emerald-50 text-emerald-600 group-hover:border-emerald-400 group-hover:bg-emerald-100',
              )}>
              <BedIcon occupied={occupied} selected={isSelected} />
            </div>
            <span
              className={cn(
                'max-w-[5.5rem] truncate text-center font-semibold',
                size === 'sm' ? 'text-[10px]' : 'text-xs',
                occupied ? 'text-slate-700' : 'text-emerald-800',
              )}>
              {label}
            </span>
            {occupied && admission ?
              <span
                className={cn(
                  'max-w-[5.5rem] truncate text-center text-slate-600',
                  size === 'sm' ? 'text-[9px]' : 'text-[10px]',
                )}
                title={admission.patientName}>
                {admission.patientName}
              </span>
            : !occupied ?
              <span
                className={cn(
                  'text-center font-medium text-emerald-600',
                  size === 'sm' ? 'text-[9px]' : 'text-[10px]',
                )}>
                Bo‘sh
              </span>
            : null}
          </>
        );

        if (selectable && !occupied) {
          return (
            <button
              key={index}
              type="button"
              role="option"
              aria-selected={isSelected}
              title={`${label} — tanlash`}
              onClick={() => onSelect?.(index)}
              className="group flex min-w-[5.5rem] flex-col items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-rose-400">
              {content}
            </button>
          );
        }

        if (selectable && occupied) {
          return (
            <div
              key={index}
              role="option"
              aria-disabled
              title={`${label} — band (${admission?.patientName ?? ''})`}
              className="flex min-w-[5.5rem] cursor-not-allowed flex-col items-center gap-1 opacity-90">
              {content}
            </div>
          );
        }

        return (
          <div
            key={index}
            title={
              occupied ?
                `${label}: ${admission?.patientName ?? 'Band'}`
              : `${label}: bo‘sh`
            }
            className="flex min-w-[5.5rem] flex-col items-center gap-1">
            {content}
          </div>
        );
      })}
    </div>
  );
}
