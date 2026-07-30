export type MedicalService = {
  id: string;
  code: string;
  name: string;
  roomNumber: string;
  doctorLevel: string;
  medicalServiceGroup: string;
  medicalServicesGroup: string;
  status: string;
};

export type MedicalServiceSortKey =
  | "id"
  | "code"
  | "name"
  | "roomNumber"
  | "doctorLevel"
  | "medicalServiceGroup"
  | "medicalServicesGroup"
  | "status";

export const MEDICAL_SERVICES_STORAGE_KEY = "garmonik-medical-services-v1";
