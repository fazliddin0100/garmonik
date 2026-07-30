import { resolvePatientBirthIso } from '@/lib/patients/birth-display';
import type { PatientRow } from '@/lib/patients/types';

/** Supabase `patients` jadvalidan keladigan qator */
export type ApiPatientRecord = {
  id: string;
  card_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  father_name?: string | null;
  full_name?: string | null;
  disease_type?: string | null;
  address?: string | null;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
  birth_date?: string | null;
  jshshir?: string | null;
  referred_doctor_user_id?: string | null;
};

export function mapApiPatientToPanelPatient(item: ApiPatientRecord): PatientRow {
  const fullName =
    (typeof item.full_name === 'string' && item.full_name.trim()) ||
    [item.last_name, item.first_name, item.father_name]
      .filter((x) => typeof x === 'string' && x.trim())
      .join(' ')
      .trim();

  return {
    id: item.id,
    fullName,
    gender: typeof item.gender === 'string' ? item.gender.trim() : '',
    birthDate: resolvePatientBirthIso(item.birth_date, item.age),
    diseaseType: typeof item.disease_type === 'string' ? item.disease_type.trim() : '',
    address: typeof item.address === 'string' ? item.address.trim() : '',
    documentType: 'Паспорт Узбекистана',
    documentNumber: '',
    jshshir: typeof item.jshshir === 'string' ? item.jshshir.trim() : '',
    country: '',
    region: '',
    district: '',
    contact: typeof item.phone === 'string' ? item.phone.trim() : '',
    population: 'Да',
    age:
      typeof item.age === 'number' && Number.isFinite(item.age) ?
        Math.floor(item.age)
      : undefined,
    cardNumber:
      typeof item.card_number === 'string' && item.card_number.trim() ?
        item.card_number.trim()
      : undefined,
    referredDoctorUserId:
      typeof item.referred_doctor_user_id === 'string' &&
      item.referred_doctor_user_id.trim() ?
        item.referred_doctor_user_id.trim()
      : undefined,
  };
}
