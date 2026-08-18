import type { InpatientAdmission } from '@/lib/inpatient/types';
import { getBedOccupancyMap } from '@/lib/inpatient/room-beds';

export type PatientGenderKind = 'male' | 'female' | 'unknown';

export function normalizePatientGender(
  raw: string | null | undefined,
): PatientGenderKind {
  const g = (raw ?? '').trim().toLowerCase();
  if (!g) return 'unknown';
  if (
    g === 'erkak' ||
    g === 'male' ||
    g === 'm' ||
    g.includes('erkak') ||
    g === 'муж' ||
    g.startsWith('муж')
  ) {
    return 'male';
  }
  if (
    g === 'ayol' ||
    g === 'female' ||
    g === 'f' ||
    g.includes('ayol') ||
    g === 'жен' ||
    g.startsWith('жен')
  ) {
    return 'female';
  }
  return 'unknown';
}

export function patientGenderLabel(
  raw: string | null | undefined,
): string {
  const kind = normalizePatientGender(raw);
  if (kind === 'male') return 'Erkak';
  if (kind === 'female') return 'Ayol';
  const trimmed = (raw ?? '').trim();
  return trimmed || 'Noma’lum';
}

export function patientGenderShort(
  raw: string | null | undefined,
): string {
  const kind = normalizePatientGender(raw);
  if (kind === 'male') return 'E';
  if (kind === 'female') return 'A';
  return '?';
}

/** Palatadagi band karavotlar jinsi bo‘yicha qisqa xulosa */
export function roomOccupancyGenderSummary(
  roomId: string,
  admissions: InpatientAdmission[],
  capacity: number,
): {
  kind: 'empty' | 'male' | 'female' | 'mixed' | 'unknown';
  label: string;
  male: number;
  female: number;
  unknown: number;
} {
  const map = getBedOccupancyMap(roomId, admissions, capacity);
  let male = 0;
  let female = 0;
  let unknown = 0;
  for (const admission of map.values()) {
    const kind = normalizePatientGender(admission.gender);
    if (kind === 'male') male += 1;
    else if (kind === 'female') female += 1;
    else unknown += 1;
  }
  const occupied = male + female + unknown;
  if (occupied === 0) {
    return { kind: 'empty', label: 'Bo‘sh', male, female, unknown };
  }
  if (male > 0 && female > 0) {
    return {
      kind: 'mixed',
      label: `Aralash · ${male}E / ${female}A`,
      male,
      female,
      unknown,
    };
  }
  if (male > 0 && female === 0) {
    return {
      kind: male === occupied ? 'male' : 'unknown',
      label: unknown > 0 ? `Erkak (+${unknown}?)` : 'Erkak',
      male,
      female,
      unknown,
    };
  }
  if (female > 0 && male === 0) {
    return {
      kind: female === occupied ? 'female' : 'unknown',
      label: unknown > 0 ? `Ayol (+${unknown}?)` : 'Ayol',
      male,
      female,
      unknown,
    };
  }
  return { kind: 'unknown', label: 'Jins noma’lum', male, female, unknown };
}

export function enrichAdmissionsWithPatientGender<
  T extends { id: string; gender?: string | null },
>(
  admissions: InpatientAdmission[],
  patients: T[],
): InpatientAdmission[] {
  const byId = new Map(patients.map((p) => [p.id, p.gender?.trim() || '']));
  return admissions.map((a) => {
    if (a.gender?.trim()) return a;
    const fromPatient = byId.get(a.patientId);
    if (!fromPatient) return a;
    return { ...a, gender: fromPatient };
  });
}
