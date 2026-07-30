export type ReceptionUser = {
  id: string;
  username: string;
  shortName: string;
  roleName: string;
  lastAccess: string;
  email: string;
  status: string;
  password: string;
  securityPin: string;
};

export type ReceptionSortKey =
  | 'id'
  | 'username'
  | 'shortName'
  | 'roleName'
  | 'lastAccess'
  | 'email'
  | 'status';

export const RECEPTION_STORAGE_KEY = 'garmonik-reception-users-v1';
