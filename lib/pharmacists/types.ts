export type PharmacistRow = {
  id: string;
  code: string;
  fullName: string;
  specialty: string;
  degree: string;
  department: string;
  contact: string;
  login: string;
  password?: string;
  status: string;
};

export type PharmacistSortKey =
  | 'id'
  | 'code'
  | 'fullName'
  | 'specialty'
  | 'degree'
  | 'department'
  | 'contact'
  | 'login'
  | 'status';

export const PHARMACISTS_STORAGE_KEY = 'garmonik-pharmacists-v1';
