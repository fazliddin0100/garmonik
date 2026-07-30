import type { DoctorDetailView } from '@/components/patients/doctor-detail-views';

export type DoctorMedicalFormId =
  | 'qabul-korigi'
  | 'navbatchi-shifokor-korigi'
  | 'birlamchi-tekshiruv'
  | 'qoshma-korik'
  | 'klinik-tashxis'
  | 'bosqichli-epikriz'
  | 'dorilar-belgilanishi'
  | 'statsionar-tekshiruv'
  | 'tibbiy-xizmat-natijalari'
  | 'fto'
  | 'tor-mutaxassis-konsultatsiyasi'
  | 'operatsiya'
  | 'reanimatsiya'
  | 'barcha-epikrizlar';

export type DoctorMedicalFormDef = {
  id: DoctorMedicalFormId;
  label: string;
  moduleView?: DoctorDetailView;
};

export const DOCTOR_MEDICAL_FORMS: DoctorMedicalFormDef[] = [
  { id: 'qabul-korigi', label: "Qabul ko'rigi" },
  { id: 'navbatchi-shifokor-korigi', label: "Navbatchi shifokor ko'rigi" },
  { id: 'birlamchi-tekshiruv', label: 'Birlamchi tekshiruv' },
  { id: 'qoshma-korik', label: "Qo'shma ko'rik" },
  { id: 'klinik-tashxis', label: 'Klinik tashxis', moduleView: 'tashxis' },
  { id: 'bosqichli-epikriz', label: 'Bosqichli epikriz' },
  { id: 'dorilar-belgilanishi', label: 'Dorilar belgilanishi', moduleView: 'dorilar' },
  { id: 'statsionar-tekshiruv', label: 'Statsionar tekshiruv' },
  { id: 'tibbiy-xizmat-natijalari', label: 'Tibbiy xizmat natijalari' },
  { id: 'fto', label: 'FTO' },
  {
    id: 'tor-mutaxassis-konsultatsiyasi',
    label: 'Tor doiradagi mutaxassislar konsultatsiyasi',
  },
  { id: 'operatsiya', label: 'Operatsiya' },
  { id: 'reanimatsiya', label: 'Reanimatsiya' },
  { id: 'barcha-epikrizlar', label: 'Barcha epikrizlar' },
];

export function findDoctorMedicalForm(id: DoctorMedicalFormId): DoctorMedicalFormDef {
  return DOCTOR_MEDICAL_FORMS.find((f) => f.id === id) ?? DOCTOR_MEDICAL_FORMS[0];
}
