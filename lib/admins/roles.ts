export type AdminRoleOption = { value: string; label: string };

/** Klinika administratori uchun tayyor rollar (panelda select) */
export const ADMIN_ROLE_OPTIONS: AdminRoleOption[] = [
  { value: 'Super administrator', label: 'Super administrator' },
  { value: 'Klinika direktori', label: 'Klinika direktori' },
  { value: 'Bosh shifokor', label: 'Bosh shifokor' },
  { value: 'Buxgalter / moliya', label: 'Buxgalter / moliya' },
  { value: 'Kadrlar bo‘limi', label: 'Kadrlar bo‘limi' },
  { value: 'Laboratoriya menejeri', label: 'Laboratoriya menejeri' },
  { value: 'Laboratoriya (natijalar)', label: 'Laboratoriya (natijalar)' },
  { value: 'Registrator / qabul', label: 'Registrator / qabul' },
  { value: 'Marketing / PR', label: 'Marketing / PR' },
  { value: 'IT / texnik yordam', label: 'IT / texnik yordam' },
  { value: 'Hamshira', label: 'Hamshira' },
  { value: 'Bosh hamshira', label: 'Bosh hamshira' },
  { value: 'Shifokor', label: 'Shifokor' },
  { value: 'Kabinet', label: 'Kabinet' },
];

export const ADMIN_ROLE_VALUES = new Set(ADMIN_ROLE_OPTIONS.map((o) => o.value));
