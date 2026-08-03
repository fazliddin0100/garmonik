import { CLINIC_RESOURCE_KEYS, type ClinicResourceKey } from '@/lib/clinic-data/keys';

export type DataModuleKind = 'clinic-resource' | 'patients-registry';

export type DataModuleId = ClinicResourceKey | 'patients-registry';

export interface DataModuleDef {
  id: DataModuleId;
  label: string;
  description: string;
  category: string;
  kind: DataModuleKind;
}

export const DATA_MODULE_CATEGORIES = [
  'Bemorlar',
  'Navbat va statsionar',
  'Klinika tuzilmasi',
  'Xizmatlar va narxlar',
  'Xodimlar',
  'Hamkorlar',
  'Ombor va ta\'minot',
  'Laboratoriya',
  'Sozlamalar',
] as const;

const CLINIC_RESOURCE_META: Record<
  ClinicResourceKey,
  Omit<DataModuleDef, 'id' | 'kind'>
> = {
  patients: {
    label: 'Bemorlar (klinik)',
    description: 'Tahlil, retsept, tarix — JSON qatlam',
    category: 'Bemorlar',
  },
  departments: {
    label: 'Bo\'limlar',
    description: 'Klinika bo\'limlari ro\'yxati',
    category: 'Klinika tuzilmasi',
  },
  rooms: {
    label: 'Xonalar',
    description: 'Kabinet va palata xonalari',
    category: 'Klinika tuzilmasi',
  },
  'service-types': {
    label: 'Xizmat turlari',
    description: 'Xizmat toifalari',
    category: 'Xizmatlar va narxlar',
  },
  'medical-service-groups': {
    label: 'Xizmat guruhlari',
    description: 'Tibbiy xizmat guruhlari',
    category: 'Xizmatlar va narxlar',
  },
  'medical-services': {
    label: 'Tibbiy xizmatlar',
    description: 'Xizmatlar katalogi',
    category: 'Xizmatlar va narxlar',
  },
  'service-prices': {
    label: 'Xizmat narxlari',
    description: 'Narxlar jadvali',
    category: 'Xizmatlar va narxlar',
  },
  partners: {
    label: 'Hamkorlar',
    description: 'Hamkor tashkilotlar',
    category: 'Hamkorlar',
  },
  contracts: {
    label: 'Shartnomalar',
    description: 'Shartnoma va xarajat manbalari',
    category: 'Hamkorlar',
  },
  'pharmacy-products': {
    label: 'Dori-darmonlar',
    description: 'Farmatsiya mahsulotlari',
    category: 'Ombor va ta\'minot',
  },
  'kitchen-products': {
    label: 'Oshxona mahsulotlari',
    description: 'Oshxona ombori',
    category: 'Ombor va ta\'minot',
  },
  'kitchen-staff': {
    label: 'Oshxona xodimlari',
    description: 'Oshxona kadrlari',
    category: 'Xodimlar',
  },
  doctors: {
    label: 'Shifokorlar',
    description: 'Shifokorlar ro\'yxati',
    category: 'Xodimlar',
  },
  nurses: {
    label: 'Hamshiralar',
    description: 'Hamshiralar ro\'yxati',
    category: 'Xodimlar',
  },
  'laboratory-staff': {
    label: 'Laborantlar',
    description: 'Laboratoriya xodimlari',
    category: 'Xodimlar',
  },
  reception: {
    label: 'Qabul xodimlari',
    description: 'Reception / qabul',
    category: 'Xodimlar',
  },
  pharmacists: {
    label: 'Farmatsevtlar',
    description: 'Dorixona xodimlari',
    category: 'Xodimlar',
  },
  admins: {
    label: 'Administratorlar',
    description: 'Admin profillari (JSON)',
    category: 'Xodimlar',
  },
  'clinic-settings': {
    label: 'Klinika sozlamalari',
    description: 'Nom, jadval, integratsiyalar',
    category: 'Sozlamalar',
  },
  'lab-catalog': {
    label: 'Lab katalogi',
    description: 'Laboratoriya tahlil katalogi',
    category: 'Laboratoriya',
  },
  queue: {
    label: 'Navbat',
    description: 'Jonli navbat yozuvlari',
    category: 'Navbat va statsionar',
  },
  'inpatient-admissions': {
    label: 'Statsionar',
    description: 'Statsionar bemorlar',
    category: 'Navbat va statsionar',
  },
  'supply-orders': {
    label: 'Ta\'minot buyurtmalari',
    description: 'Supply orders',
    category: 'Ombor va ta\'minot',
  },
  'supply-purchases': {
    label: 'Ta\'minot xaridlari',
    description: 'Supply purchases',
    category: 'Ombor va ta\'minot',
  },
  'kadrlar-employee-profiles': {
    label: 'Kadrlar xodim profillari',
    description: 'Kadrlar ma’lumotlari va obyektivkalar',
    category: 'Xodimlar',
  },
};

export const DATA_MODULES: DataModuleDef[] = [
  {
    id: 'patients-registry',
    label: 'Bemorlar kartotekasi',
    description: 'PostgreSQL — karta raqami, FIO, telefon',
    category: 'Bemorlar',
    kind: 'patients-registry',
  },
  ...CLINIC_RESOURCE_KEYS.map((key) => ({
    id: key,
    kind: 'clinic-resource' as const,
    ...CLINIC_RESOURCE_META[key],
  })),
];

export function modulesByCategory(): Map<string, DataModuleDef[]> {
  const map = new Map<string, DataModuleDef[]>();
  for (const cat of DATA_MODULE_CATEGORIES) {
    map.set(cat, []);
  }
  for (const mod of DATA_MODULES) {
    const list = map.get(mod.category) ?? [];
    list.push(mod);
    map.set(mod.category, list);
  }
  return map;
}

export function isClinicResourceModule(
  mod: DataModuleDef,
): mod is DataModuleDef & { id: ClinicResourceKey; kind: 'clinic-resource' } {
  return mod.kind === 'clinic-resource';
}
