import type { PatientRow } from '@/lib/patients/types';

/** Shifokor qabulida tibbiy xizmat (tashxis yoki tahlil buyurtmasi) bajarilgan */
export function hasClinicalServiceByDoctor(p: PatientRow): boolean {
  const hasNote = Boolean(p.queueClinicalNote?.trim());
  const hasLabs = (p.orderedLaboratoryKeys?.length ?? 0) > 0;
  return hasNote || hasLabs;
}

/** Faqat navbatda saqlangan shifokor (hisobot uchun) */
export function attendingDoctorId(clinical: PatientRow): string | null {
  const id = clinical.attendingDoctorUserId?.trim();
  return id || null;
}

/**
 * Shifokor kabineti «Bemorlar» / hisobot: faqat shu shifokorga biriktirilgan
 * (yo‘naltirilgan yoki qabul qilgan) bemorlar.
 */
export function isDoctorClinicalPatient(
  p: PatientRow,
  doctorUserId: string | null,
): boolean {
  if (!doctorUserId) return false;
  if (!hasClinicalServiceByDoctor(p)) return false;

  const attending = p.attendingDoctorUserId?.trim() || '';
  const referred = p.referredDoctorUserId?.trim() || '';
  return attending === doctorUserId || referred === doctorUserId;
}
