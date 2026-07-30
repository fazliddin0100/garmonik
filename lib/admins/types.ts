export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  /** Otasining ismi (otchistik) */
  fatherName: string;
  age: number;
  roleName: string;
  username: string;
  phone: string;
  password: string;
  securityPin: string;
};

export type AdminSortKey =
  | 'firstName'
  | 'lastName'
  | 'fatherName'
  | 'age'
  | 'roleName'
  | 'username'
  | 'phone'
  | 'lastLoginAt';

export const ADMINS_STORAGE_KEY = 'garmonik-admin-users-v3';

export function adminDisplayName(
  a: Pick<AdminUser, 'firstName' | 'lastName' | 'fatherName' | 'username'>,
): string {
  const n = [a.firstName, a.lastName, a.fatherName]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ');
  return n || a.username;
}
