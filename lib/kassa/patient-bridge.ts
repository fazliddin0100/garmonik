import type { PatientRow } from '@/lib/db/patients';
import { findPatientById } from '@/lib/db/patients';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { prisma } from '@/lib/kassa/prisma';

export type GarmonikPatientSnapshot = {
  id: string;
  full_name: string;
  phone: string;
  birth_date?: string | null;
};

export type KassaPatientSearchHit = {
  garmonikPatientId: string;
  kassaPatientId: string | null;
  cardNumber: string;
  fullName: string;
  phone: string;
  diseaseType: string;
};

function parseBirthDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** public.patients → kassa.patients (garmonik_patient_id bilan) */
export async function ensureKassaPatientForGarmonik(
  patient: GarmonikPatientSnapshot,
) {
  const birthDate = parseBirthDate(patient.birth_date);
  const existing = await prisma.patient.findFirst({
    where: { garmonikPatientId: patient.id },
  });

  if (existing) {
    const needsUpdate =
      existing.fullName !== patient.full_name.trim() ||
      (existing.phone ?? '') !== (patient.phone?.trim() ?? '') ||
      (birthDate?.toISOString() ?? null) !== (existing.birthDate?.toISOString() ?? null);

    if (!needsUpdate) return existing;

    return prisma.patient.update({
      where: { id: existing.id },
      data: {
        fullName: patient.full_name.trim(),
        phone: patient.phone?.trim() || null,
        birthDate,
      },
    });
  }

  return prisma.patient.create({
    data: {
      fullName: patient.full_name.trim(),
      phone: patient.phone?.trim() || null,
      birthDate,
      garmonikPatientId: patient.id,
    },
  });
}

export async function mapGarmonikRowsForKassaSearch(
  rows: PatientRow[],
): Promise<KassaPatientSearchHit[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => String(r.id));
  const linked = await prisma.patient.findMany({
    where: { garmonikPatientId: { in: ids } },
    select: { id: true, garmonikPatientId: true },
  });
  const kassaByGarmonik = new Map(
    linked
      .filter((p) => p.garmonikPatientId)
      .map((p) => [p.garmonikPatientId as string, p.id]),
  );

  return rows.map((row) => ({
    garmonikPatientId: String(row.id),
    kassaPatientId: kassaByGarmonik.get(String(row.id)) ?? null,
    cardNumber: String(row.card_number),
    fullName: String(row.full_name),
    phone: String(row.phone ?? ''),
    diseaseType: String(row.disease_type ?? ''),
  }));
}

export async function resolveKassaPatientForInvoice(input: {
  kassaPatientId?: string;
  garmonikPatientId?: string;
  patientName: string;
  patientPhone?: string;
}) {
  if (input.kassaPatientId) {
    const found = await prisma.patient.findUnique({ where: { id: input.kassaPatientId } });
    if (!found) throw new Error('Kassa bemori topilmadi');
    return found;
  }

  if (input.garmonikPatientId) {
    const linked = await prisma.patient.findFirst({
      where: { garmonikPatientId: input.garmonikPatientId },
    });
    if (linked) return linked;

    const clinicId = await getDefaultClinicId();
    const garmonik = await findPatientById(clinicId, input.garmonikPatientId);
    if (!garmonik) throw new Error('Klinika bemori topilmadi');
    return ensureKassaPatientForGarmonik({
      id: String(garmonik.id),
      full_name: String(garmonik.full_name),
      phone: String(garmonik.phone ?? ''),
      birth_date: garmonik.birth_date ? String(garmonik.birth_date) : null,
    });
  }

  return prisma.patient.create({
    data: {
      fullName: input.patientName.trim(),
      phone: input.patientPhone?.trim() || null,
    },
  });
}
