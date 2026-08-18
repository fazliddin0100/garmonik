'use client';

import type { ClinicRoom } from '@/lib/clinic-rooms/types';
import {
  normalizePatientGender,
  patientGenderLabel,
  patientGenderShort,
} from '@/lib/inpatient/gender';
import type { InpatientAdmission } from '@/lib/inpatient/types';
import {
  bedLabelForIndex,
  getBedOccupancyMap,
} from '@/lib/inpatient/room-beds';
import { cn } from '@/lib/utils';

function BedIcon({
  occupied,
  selected,
  size,
}: {
  occupied: boolean;
  selected: boolean;
  size: 'sm' | 'md';
}) {
  return (
    <svg
      viewBox="0 0 72 52"
      className={cn(
        'drop-shadow-sm transition-transform',
        size === 'sm' ? 'h-6 w-10' : 'h-9 w-[3.75rem]',
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

function occupiedBedStyle(gender: string | undefined): {
  shell: string;
  badge: string;
} {
  const kind = normalizePatientGender(gender);
  if (kind === 'male') {
    return {
      shell:
        'border-transparent bg-linear-to-br from-sky-500 to-blue-700 text-white shadow-sm shadow-sky-500/25',
      badge: 'bg-sky-100 text-sky-800 ring-sky-200',
    };
  }
  if (kind === 'female') {
    return {
      shell:
        'border-transparent bg-linear-to-br from-rose-500 to-pink-700 text-white shadow-sm shadow-rose-500/25',
      badge: 'bg-rose-100 text-rose-800 ring-rose-200',
    };
  }
  return {
    shell:
      'border-transparent bg-linear-to-br from-slate-500 to-slate-700 text-white shadow-sm shadow-slate-500/20',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
  };
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
  const compact = size === 'sm';

  return (
    <div
      className={cn(
        'flex flex-wrap',
        compact ? 'gap-1.5' : 'gap-2.5',
        className,
      )}
      role={selectable ? 'listbox' : 'group'}
      aria-label={`${room.name} karavotlari`}>
      {Array.from({ length: room.capacity }, (_, index) => {
        const admission = occupancy.get(index);
        const occupied = Boolean(admission);
        const isSelected = selectedIndex === index;
        const label = bedLabelForIndex(index);
        const genderLabel = patientGenderLabel(admission?.gender);
        const genderShort = patientGenderShort(admission?.gender);
        const occupiedStyle = occupiedBedStyle(admission?.gender);

        const content = (
          <>
            <div
              className={cn(
                'relative flex items-center justify-center border-2 transition-all',
                compact ? 'rounded-lg p-1' : 'rounded-xl p-1.5',
                occupied ?
                  cn(
                    occupiedStyle.shell,
                    isSelected && 'ring-2 ring-white ring-offset-1 ring-offset-slate-600',
                  )
                : isSelected ?
                  'border-rose-500 bg-emerald-100 text-emerald-700 ring-2 ring-rose-400 ring-offset-1'
                : 'border-emerald-300 bg-emerald-50 text-emerald-600 group-hover:border-emerald-400 group-hover:bg-emerald-100',
              )}>
              <BedIcon occupied={occupied} selected={isSelected} size={size} />
              {occupied ?
                <span
                  className={cn(
                    'absolute flex items-center justify-center rounded-full bg-white font-bold text-slate-800 shadow ring-1 ring-black/5',
                    compact ?
                      '-right-0.5 -top-0.5 size-3.5 text-[8px]'
                    : '-right-1 -top-1 size-4 text-[9px]',
                  )}
                  title={genderLabel}>
                  {genderShort}
                </span>
              : null}
            </div>
            <span
              className={cn(
                'truncate text-center font-semibold',
                compact ? 'max-w-[3.75rem] text-[9px]' : 'max-w-[4.75rem] text-[11px]',
                occupied ? 'text-slate-700' : 'text-emerald-800',
              )}>
              {label}
            </span>
            {occupied && admission ?
              <>
                <span
                  className={cn(
                    'inline-flex rounded-full text-center font-semibold ring-1',
                    compact ? 'px-1 py-px text-[8px]' : 'px-1.5 py-0.5 text-[9px]',
                    occupiedStyle.badge,
                  )}>
                  {genderLabel}
                </span>
                <span
                  className={cn(
                    'truncate text-center text-slate-600',
                    compact ? 'max-w-[3.75rem] text-[8px]' : 'max-w-[4.75rem] text-[9px]',
                  )}
                  title={admission.patientName}>
                  {admission.patientName}
                </span>
              </>
            : !occupied ?
              <span
                className={cn(
                  'text-center font-medium text-emerald-600',
                  compact ? 'text-[8px]' : 'text-[9px]',
                )}>
                Bo‘sh
              </span>
            : null}
          </>
        );

        const cellClass = cn(
          'flex flex-col items-center',
          compact ? 'min-w-[3.75rem] gap-0.5' : 'min-w-[4.75rem] gap-1',
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
              className={cn(
                cellClass,
                'group rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-rose-400',
              )}>
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
              title={`${label} — band (${genderLabel}: ${admission?.patientName ?? ''})`}
              className={cn(cellClass, 'cursor-not-allowed opacity-90')}>
              {content}
            </div>
          );
        }

        return (
          <div
            key={index}
            title={
              occupied ?
                `${label}: ${genderLabel} · ${admission?.patientName ?? 'Band'}`
              : `${label}: bo‘sh`
            }
            className={cellClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
