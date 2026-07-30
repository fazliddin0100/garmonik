import type { ClinicRoom } from '@/lib/clinic-rooms/types';
import type { InpatientAdmission } from '@/lib/inpatient/types';

/** Faol yotqizishlar bo'yicha xona bandligini qayta hisoblash */
export function syncRoomsWithAdmissions(
  rooms: ClinicRoom[],
  admissions: InpatientAdmission[],
): ClinicRoom[] {
  const active = admissions.filter((a) => a.status === 'admitted');
  const countByRoom = new Map<string, number>();
  for (const a of active) {
    if (!a.roomId) continue;
    countByRoom.set(a.roomId, (countByRoom.get(a.roomId) ?? 0) + 1);
  }
  return rooms.map((room) => ({
    ...room,
    occupied: Math.min(room.capacity, countByRoom.get(room.id) ?? 0),
  }));
}

export function todayDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowTimeHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatAdmissionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
