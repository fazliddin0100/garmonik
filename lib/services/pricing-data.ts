export type ServiceGroupKey =
  | 'fizioterapiya'
  | 'kardiologiya'
  | 'laboratoriya'
  | 'pullik-xizmat'
  | 'shifokor-korigi'
  | 'uzi'
  | 'boshqa';

export type ServicePriceRow = {
  id: string;
  code: string;
  group: ServiceGroupKey;
  groupLabel: string;
  name: string;
  price: number;
};

/** Bir xil `id` bo‘lgan qatorlar (masalan, 65564) uchun noyob kalit */
export function servicePriceKey(row: ServicePriceRow): string {
  return `${row.id}-${row.code}`;
}

export function priceRowByServiceKey(key: string, rows: ServicePriceRow[]): ServicePriceRow | undefined {
  return rows.find((r) => servicePriceKey(r) === key);
}

export function filterLaboratoryPriceRows(rows: ServicePriceRow[]): ServicePriceRow[] {
  return rows.filter((r) => r.group === 'laboratoriya');
}

/** Navbat dialogida: laboratoriya, shifokor ko‘rigi, UZI — bemor topshirishi / buyurtma */
const QUEUE_ORDERABLE_GROUPS = new Set<ServiceGroupKey>([
  'laboratoriya',
  'shifokor-korigi',
  'uzi',
]);

export function isQueueOrderablePriceRow(row: ServicePriceRow): boolean {
  return QUEUE_ORDERABLE_GROUPS.has(row.group);
}

export function filterQueueOrderablePriceRows(rows: ServicePriceRow[]): ServicePriceRow[] {
  return rows.filter(isQueueOrderablePriceRow);
}

/** Narxlar faqat admin katalogidan — demo qatorlar yo‘q */
export const SERVICE_PRICE_ROWS: ServicePriceRow[] = [];

export const LABORATORY_SERVICE_ROWS: ServicePriceRow[] = filterLaboratoryPriceRows(SERVICE_PRICE_ROWS);

export const SERVICE_GROUPS: { key: ServiceGroupKey; label: string }[] = [
  { key: 'fizioterapiya', label: 'Fizioterapiya' },
  { key: 'kardiologiya', label: 'Kardiologiya' },
  { key: 'laboratoriya', label: 'Laboratoriya' },
  { key: 'pullik-xizmat', label: 'Pullik xizmatlar' },
  { key: 'shifokor-korigi', label: "Shifokor ko'rigi" },
  { key: 'uzi', label: 'UZI' },
  { key: 'boshqa', label: 'Boshqa' },
];
