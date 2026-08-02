export type DepartmentSubItem = {
  id: string;
  title: string;
  note: string;
};

export type DepartmentGroup = {
  id: string;
  title: string;
  description: string;
  /** KADRLAR_ROLE_OPTIONS key — bo‘lim xodimlari shu rol portaliga kiradi */
  roleKey: string;
  items: DepartmentSubItem[];
};

export const DEPARTMENTS_STORAGE_KEY = 'garmonik-endocrine-departments-v1';
