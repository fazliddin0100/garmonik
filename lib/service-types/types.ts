export type ServiceTypeRow = {
  /** React kaliti */
  id: string;
  /** Tizim ID (masalan 65094) */
  serviceId: string;
  /** Kod */
  code: string;
  /** Guruh / kategoriya */
  group: string;
  /** Nomi */
  name: string;
  /** Narxi (so'm) */
  price: number;
  /** Jadvaldagi tartib raqami (№) */
  rowNum: number;
};

export const SERVICE_TYPES_STORAGE_KEY = 'garmonik-service-types-v2';
