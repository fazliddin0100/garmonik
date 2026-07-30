import { normalizeAdmissionRequest } from '@/lib/inpatient/types';
import { normalizeClinicalHistory } from '@/lib/patients/clinical-history';
import { resolvePatientBirthIso } from '@/lib/patients/birth-display';
import { normalizeLaboratoryResults } from '@/lib/patients/laboratory-results';
import { normalizePatientPrescriptions } from '@/lib/patients/prescriptions';
import { normalizeAdmissionExaminations } from '@/lib/patients/admission-examination';
import { normalizeDutyDoctorExaminations } from '@/lib/patients/duty-doctor-examination';
import { normalizePrimaryExaminations } from '@/lib/patients/primary-examination';
import { normalizeJointExaminations } from '@/lib/patients/joint-examination';
import { normalizeStageEpicrisisRecords } from '@/lib/patients/stage-epicrisis';
import { normalizeSpecialistConsultations, normalizeSpecialistReferrals } from '@/lib/patients/specialist-consultation';
import { normalizeSelectedServiceResults } from '@/lib/patients/selected-service-results';
import { normalizeLabConclusion } from '@/lib/patients/lab-conclusion';
import type { PatientRow } from '@/lib/patients/types';

function emptyPatientBase(): PatientRow {
  return {
    id: '',
    fullName: '',
    gender: '',
    birthDate: '',
    diseaseType: '',
    address: '',
    documentType: 'Паспорт Узбекистана',
    documentNumber: '',
    jshshir: '',
    country: '',
    region: '',
    district: '',
    contact: '',
    population: 'Да',
  };
}

/** Klinika JSON `patients` qatorini normalizatsiya */
export function normalizePatientRow(item: unknown): PatientRow | null {
  if (!item || typeof item !== 'object') return null;
  const r = item as Partial<PatientRow>;
  if (typeof r.id !== 'string' || !r.id.trim()) return null;
  const id = r.id.trim();
  const base = emptyPatientBase();
  const storedPrev = Array.isArray(r.previousPaidServiceKeys)
    ? r.previousPaidServiceKeys.filter((x): x is string => typeof x === 'string')
    : undefined;
  const mergedPrev = storedPrev && storedPrev.length > 0 ? storedPrev : undefined;
  const rawBirthDate =
    typeof r.birthDate === 'string' ? r.birthDate
    : typeof (r as { birth_date?: string }).birth_date === 'string' ?
      (r as { birth_date: string }).birth_date
    : '';
  const age =
    typeof r.age === 'number' && Number.isFinite(r.age) ?
      Math.floor(r.age)
    : undefined;
  return {
    ...base,
    ...r,
    id,
    fullName: typeof r.fullName === 'string' ? r.fullName : '',
    gender: typeof r.gender === 'string' ? r.gender : '',
    birthDate: resolvePatientBirthIso(rawBirthDate, age),
    diseaseType: typeof r.diseaseType === 'string' ? r.diseaseType : '',
    address: typeof r.address === 'string' ? r.address : '',
    documentType: typeof r.documentType === 'string' ? r.documentType : base.documentType,
    documentNumber: typeof r.documentNumber === 'string' ? r.documentNumber : '',
    jshshir: typeof r.jshshir === 'string' ? r.jshshir : '',
    country: typeof r.country === 'string' ? r.country : '',
    region: typeof r.region === 'string' ? r.region : '',
    district: typeof r.district === 'string' ? r.district : '',
    contact: typeof r.contact === 'string' ? r.contact : '',
    population: typeof r.population === 'string' ? r.population : base.population,
    ...(mergedPrev && mergedPrev.length > 0 ? { previousPaidServiceKeys: mergedPrev } : {}),
    queueClinicalNote:
      typeof r.queueClinicalNote === 'string' ?
        r.queueClinicalNote.trim() || undefined
      : undefined,
    orderedLaboratoryKeys: (() => {
      if (Array.isArray(r.orderedLaboratoryKeys)) {
        const f = r.orderedLaboratoryKeys.filter((x): x is string => typeof x === 'string');
        return f.length > 0 ? f : undefined;
      }
      return undefined;
    })(),
    laboratoryResults: normalizeLaboratoryResults(r.laboratoryResults),
    cardNumber:
      typeof r.cardNumber === 'string' && r.cardNumber.trim() ?
        r.cardNumber.trim()
      : undefined,
    age,
    attendingDoctorUserId:
      typeof r.attendingDoctorUserId === 'string' ?
        r.attendingDoctorUserId.trim() || undefined
      : undefined,
    clinicalCompletedAt:
      typeof r.clinicalCompletedAt === 'string' ?
        r.clinicalCompletedAt.trim() || undefined
      : undefined,
    referredDoctorUserId:
      typeof r.referredDoctorUserId === 'string' ?
        r.referredDoctorUserId.trim() || undefined
      : undefined,
    inpatientAdmissionRequest: normalizeAdmissionRequest(r.inpatientAdmissionRequest) ?? undefined,
    prescriptions: normalizePatientPrescriptions(r.prescriptions),
    clinicalHistory: normalizeClinicalHistory(r.clinicalHistory),
    admissionExaminations: normalizeAdmissionExaminations(r.admissionExaminations),
    dutyDoctorExaminations: normalizeDutyDoctorExaminations(r.dutyDoctorExaminations),
    primaryExaminations: normalizePrimaryExaminations(r.primaryExaminations),
    jointExaminations: normalizeJointExaminations(r.jointExaminations),
    stageEpicrisisRecords: normalizeStageEpicrisisRecords(r.stageEpicrisisRecords),
    specialistConsultations: normalizeSpecialistConsultations(r.specialistConsultations),
    specialistReferrals: normalizeSpecialistReferrals(r.specialistReferrals),
    selectedServiceResults: normalizeSelectedServiceResults(r.selectedServiceResults),
    labConclusion: normalizeLabConclusion(r.labConclusion),
  };
}
