import type { ClinicRoom } from '@/lib/clinic-rooms/types';
import type { InpatientAdmission } from '@/lib/inpatient/types';

export function bedLabelForIndex(index: number): string {
  return `${index + 1}-karavot`;
}

export function parseBedIndexFromLabel(label: string | undefined): number | null {
  if (!label?.trim()) return null;
  const m = label.trim().match(/^(\d+)\s*[-–]?\s*karavot$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n - 1 : null;
}

/** Palatadagi band karavot indekslari (0-based) */
export function getOccupiedBedIndices(
  roomId: string,
  admissions: InpatientAdmission[],
  capacity: number,
): Set<number> {
  const active = admissions.filter(
    (a) => a.status === 'admitted' && a.roomId === roomId,
  );
  const used = new Set<number>();

  for (const a of active) {
    if (typeof a.bedIndex === 'number' && a.bedIndex >= 0 && a.bedIndex < capacity) {
      used.add(a.bedIndex);
    }
  }

  for (const a of active) {
    if (typeof a.bedIndex === 'number') continue;
    const parsed = parseBedIndexFromLabel(a.bedLabel);
    if (parsed !== null && parsed >= 0 && parsed < capacity && !used.has(parsed)) {
      used.add(parsed);
    }
  }

  for (const a of active) {
    if (typeof a.bedIndex === 'number') continue;
    if (parseBedIndexFromLabel(a.bedLabel) !== null) continue;
    let idx = 0;
    while (idx < capacity && used.has(idx)) idx++;
    if (idx < capacity) used.add(idx);
  }

  return used;
}

export function getFreeBedIndices(
  room: ClinicRoom,
  admissions: InpatientAdmission[],
): number[] {
  const occupied = getOccupiedBedIndices(room.id, admissions, room.capacity);
  const free: number[] = [];
  for (let i = 0; i < room.capacity; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  return free;
}

/** Har bir karavot indeksiga biriktirilgan yotqizish (getOccupiedBedIndices bilan mos) */
export function getBedOccupancyMap(
  roomId: string,
  admissions: InpatientAdmission[],
  capacity: number,
): Map<number, InpatientAdmission> {
  const map = new Map<number, InpatientAdmission>();
  const active = admissions.filter(
    (a) => a.status === 'admitted' && a.roomId === roomId,
  );

  for (const a of active) {
    if (typeof a.bedIndex === 'number' && a.bedIndex >= 0 && a.bedIndex < capacity) {
      if (!map.has(a.bedIndex)) map.set(a.bedIndex, a);
    }
  }

  for (const a of active) {
    if (typeof a.bedIndex === 'number') continue;
    const parsed = parseBedIndexFromLabel(a.bedLabel);
    if (parsed !== null && parsed >= 0 && parsed < capacity && !map.has(parsed)) {
      map.set(parsed, a);
    }
  }

  for (const a of active) {
    if (typeof a.bedIndex === 'number') continue;
    if (parseBedIndexFromLabel(a.bedLabel) !== null) continue;
    let idx = 0;
    while (idx < capacity && map.has(idx)) idx++;
    if (idx < capacity) map.set(idx, a);
  }

  return map;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
