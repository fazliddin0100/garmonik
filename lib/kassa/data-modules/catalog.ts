export const KASSA_MODULE_IDS = [
  'kassa-users',
  'kassa-clinic-settings',
  'kassa-payment-types',
  'kassa-service-categories',
  'kassa-services',
  'kassa-service-price-history',
  'kassa-patients',
  'kassa-invoices',
  'kassa-expenses',
  'kassa-audit-logs',
] as const;

export type KassaModuleId = (typeof KASSA_MODULE_IDS)[number];

export interface KassaModuleDef {
  id: KassaModuleId;
  label: string;
  description: string;
  category: string;
  /** Import tartibi (kichik = avval) */
  importOrder: number;
}

export const KASSA_MODULE_CATEGORIES = [
  'Asosiy',
  'Xizmatlar katalogi',
  'Bemorlar',
  'Cheklar',
  'Xarajatlar',
  'Jurnal',
] as const;

export const KASSA_MODULES: KassaModuleDef[] = [
  {
    id: 'kassa-users',
    label: 'Kassa foydalanuvchilari',
    description: 'Admin va kassir loginlari',
    category: 'Asosiy',
    importOrder: 1,
  },
  {
    id: 'kassa-clinic-settings',
    label: 'Kassa klinika profili',
    description: 'Nom, manzil, telefon, logo',
    category: 'Asosiy',
    importOrder: 2,
  },
  {
    id: 'kassa-payment-types',
    label: 'To\'lov turlari',
    description: 'Naqt, terminal, Click, Payme...',
    category: 'Asosiy',
    importOrder: 3,
  },
  {
    id: 'kassa-service-categories',
    label: 'Xizmat kategoriyalari',
    description: 'Kassa xizmat guruhlari',
    category: 'Xizmatlar katalogi',
    importOrder: 4,
  },
  {
    id: 'kassa-services',
    label: 'Kassa xizmatlari',
    description: 'Xizmatlar va narxlar',
    category: 'Xizmatlar katalogi',
    importOrder: 5,
  },
  {
    id: 'kassa-service-price-history',
    label: 'Narx o\'zgarish tarixi',
    description: 'Xizmat narxlari tarixi',
    category: 'Xizmatlar katalogi',
    importOrder: 6,
  },
  {
    id: 'kassa-patients',
    label: 'Kassa bemorlari',
    description: 'Kassa bazasidagi bemorlar',
    category: 'Bemorlar',
    importOrder: 7,
  },
  {
    id: 'kassa-invoices',
    label: 'Cheklar (to\'liq)',
    description: 'Cheklar, qatorlar va to\'lovlar',
    category: 'Cheklar',
    importOrder: 8,
  },
  {
    id: 'kassa-expenses',
    label: 'Xarajatlar (to\'liq)',
    description: 'Xarajatlar va to\'lovlar',
    category: 'Xarajatlar',
    importOrder: 9,
  },
  {
    id: 'kassa-audit-logs',
    label: 'Audit jurnali',
    description: 'Kassa harakatlar tarixi',
    category: 'Jurnal',
    importOrder: 10,
  },
];

export function isKassaModuleId(s: string): s is KassaModuleId {
  return (KASSA_MODULE_IDS as readonly string[]).includes(s);
}

export function kassaModulesByCategory(): Map<string, KassaModuleDef[]> {
  const map = new Map<string, KassaModuleDef[]>();
  for (const cat of KASSA_MODULE_CATEGORIES) {
    map.set(cat, []);
  }
  for (const mod of KASSA_MODULES) {
    const list = map.get(mod.category) ?? [];
    list.push(mod);
    map.set(mod.category, list);
  }
  return map;
}

export function sortedKassaModules(): KassaModuleDef[] {
  return [...KASSA_MODULES].sort((a, b) => a.importOrder - b.importOrder);
}
