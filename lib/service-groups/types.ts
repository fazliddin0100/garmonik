export type MedicalServiceGroup = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export type MedicalServiceGroupSortKey =
  | "id"
  | "code"
  | "name"
  | "status";

export const MEDICAL_SERVICE_GROUPS_STORAGE_KEY =
  "garmonik-medical-service-groups-v1";
