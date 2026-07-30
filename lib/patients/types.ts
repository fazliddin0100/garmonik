import type { LaboratoryResultEntry } from '@/lib/patients/laboratory-results';
import type { ClinicalHistoryEntry } from '@/lib/patients/clinical-history';
import type { InpatientAdmissionRequest } from '@/lib/inpatient/types';
import type { PatientPrescription } from '@/lib/patients/prescriptions';
import type { PatientAdmissionExamination } from '@/lib/patients/admission-examination';
import type { PatientDutyDoctorExamination } from '@/lib/patients/duty-doctor-examination';
import type { PatientPrimaryExamination } from '@/lib/patients/primary-examination';
import type { PatientJointExamination } from '@/lib/patients/joint-examination';
import type { PatientStageEpicrisis } from '@/lib/patients/stage-epicrisis';
import type { PatientSpecialistConsultation } from '@/lib/patients/specialist-consultation';
import type { PatientSpecialistReferral } from '@/lib/patients/specialist-consultation';
import type { SelectedServiceResultRef } from '@/lib/patients/selected-service-results';
import type { PatientLabConclusion } from '@/lib/patients/lab-conclusion';
export type PatientRow = {
  id: string;
  fullName: string;
  gender: string;
  birthDate: string;
  diseaseType: string;
  address: string;
  documentType: string;
  documentNumber: string;
  jshshir: string;
  country: string;
  region: string;
  district: string;
  contact: string;
  population: string;
  /** Oldingi pullik / laboratoriya xizmatlari (`id-kod` format, `servicePriceKey`) */
  previousPaidServiceKeys?: string[];
  /** Navbat / kabinetdan kiritilgan tibbiy eskiz (tashxis qoralamasi) */
  queueClinicalNote?: string;
  /** Navbatda tanlangan: katalog `cat:…` va/yoki narx kaliti (`id-kod`, laboratoriya / ko‘rik / UZI) */
  orderedLaboratoryKeys?: string[];
  /** Hamshira kiritgan tahlil natijalari */
  laboratoryResults?: LaboratoryResultEntry[];
  /** Supabase kartochka raqami (masalan KB-2026-00001) */
  cardNumber?: string;
  /** Qabulda kiritilgan yosh */
  age?: number;
  /** Tibbiy xizmat ko‘rsatgan shifokor (auth user id) */
  attendingDoctorUserId?: string;
  /** Tibbiy xizmat yakunlangan vaqt (ISO) */
  clinicalCompletedAt?: string;
  /** Qabulda yo‘naltirilgan shifokor (auth user id) */
  referredDoctorUserId?: string;
  /** Shifokor klinikaga yotqizish so‘rovi */
  inpatientAdmissionRequest?: InpatientAdmissionRequest;
  /** Shifokor belgilagan dorilar (retseptlar) */
  prescriptions?: PatientPrescription[];
  /** Bemor kartasidagi to‘liq tibbiy tarix (tashxis, tahlil, dori, kuzatuv) */
  clinicalHistory?: ClinicalHistoryEntry[];
  /** Qabul ko‘rig‘i shakllari (har biri alohida yozuv) */
  admissionExaminations?: PatientAdmissionExamination[];
  /** Navbatchi shifokor ko‘rig‘i shakllari */
  dutyDoctorExaminations?: PatientDutyDoctorExamination[];
  /** Birlamchi tekshiruv shakllari */
  primaryExaminations?: PatientPrimaryExamination[];
  /** Qo'shma ko'rik shakllari */
  jointExaminations?: PatientJointExamination[];
  /** Bosqichli epikriz yozuvlari */
  stageEpicrisisRecords?: PatientStageEpicrisis[];
  /** Tor doiradagi mutaxassislar konsultatsiyasi */
  specialistConsultations?: PatientSpecialistConsultation[];
  /** Tor mutaxassislarga yo'naltirishlar */
  specialistReferrals?: PatientSpecialistReferral[];
  /** Shifokor tibbiy xizmat natijalaridan tanlagan lab / mutaxassis natijalari */
  selectedServiceResults?: SelectedServiceResultRef[];
  /** Shifokor laboratoriya natijalari asosida yozgan xulosa (ko‘chirma uchun) */
  labConclusion?: PatientLabConclusion;
};

export type PatientSortKey =
  | "id"
  | "fullName"
  | "gender"
  | "birthDate"
  | "diseaseType"
  | "address"
  | "documentType"
  | "documentNumber"
  | "jshshir"
  | "country"
  | "region"
  | "district"
  | "contact"
  | "population";

export const PATIENTS_STORAGE_KEY = "garmonik-patients-v2";
export const PATIENTS_PER_PAGE = 15;
