export type ServiceGroupKey =
  | 'fizioterapiya'
  | 'kardiologiya'
  | 'laboratoriya'
  | 'pullik-xizmat'
  | 'shifokor-korigi'
  | 'uzi';

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

function s(
  id: string,
  code: string,
  group: ServiceGroupKey,
  groupLabel: string,
  name: string,
  price: number,
): ServicePriceRow {
  return { id, code, group, groupLabel, name, price };
}

export const SERVICE_PRICE_ROWS: ServicePriceRow[] = [
  s('65104', '044', 'fizioterapiya', 'Fizioterapiya (EKG)', 'EKG-elektrokardiografiya (apparat ELI 3-kanalli)', 42000),
  s('65094', '034', 'fizioterapiya', 'Fizioterapiya', 'Bel va orqa pog\'ona umurtqasini uqolash', 34000),
  s('65090', '030', 'fizioterapiya', 'Fizioterapiya', 'Bosh, yuz va bo\'yin mushaklarini uqolash', 32000),
  s('65089', '029', 'fizioterapiya', 'Fizioterapiya', 'Elektroforez (C C1 bilan)', 35000),
  s('65088', '028', 'fizioterapiya', 'Fizioterapiya', 'Elektroforez (boshga)', 95000),
  s('65087', '026', 'fizioterapiya', 'Fizioterapiya', 'Elektroforez (N4 C1 umurtqa bilan)', 25000),
  s('65082', '021', 'fizioterapiya', 'Fizioterapiya', 'Ko\'krak qafasi uqolashi', 37000),
  s('65080', '019', 'fizioterapiya', 'Fizioterapiya', 'Qorinning old devor mushaklarini uqolash', 34000),
  s('65079', '018', 'fizioterapiya', 'Fizioterapiya', 'Son sohasi bo\'g\'imlarini uqolash', 34000),
  s('65071', '010', 'fizioterapiya', 'Fizioterapiya', 'Yelka va qo\'l soxasini uqolash', 34000),
  s('65070', '022', 'kardiologiya', 'Kardiologiya', 'Stentlash', 500000),

  s('65192', '0022', 'laboratoriya', 'Laboratoriya', 'Autoimmun tekshiruvlar', 2043000),
  s('65599', '0003', 'laboratoriya', 'Laboratoriya', 'Bakteriyal usuv tahlili', 869000),
  s('65596', '0021', 'laboratoriya', 'Laboratoriya', 'COVID-19 antitan', 148000),
  s('65573', '0032', 'laboratoriya', 'Laboratoriya', 'DNK fragmentatsiyasini aniqlash testi', 905000),
  s('65181', '0019', 'laboratoriya', 'Laboratoriya', 'Express tahlil', 605000),
  s('65306', '0016', 'laboratoriya', 'Laboratoriya', 'Eritrosit cho\'kish tezligi (SOE, ESR)', 26000),
  s('65567', '0020', 'laboratoriya', 'Laboratoriya', 'ERKAN GEMOGLOBAN', 78000),
  s('65564', '0013', 'laboratoriya', 'Laboratoriya', 'Glyukoza tolerantlik test tahlili', 477000),
  s('65561', '0012', 'laboratoriya', 'Laboratoriya', 'GORMONLAR IXLA (CLIA)', 3528000),
  s('65564', '0017', 'laboratoriya', 'Laboratoriya', 'HOMA va CARO indeksi', 107000),
  s('65556', '0015', 'laboratoriya', 'Laboratoriya', 'IFA Gepatitlar', 308000),
  s('65562', '0014', 'laboratoriya', 'Laboratoriya', 'Immunofenotahlil (IFA)', 2737000),
  s('65569', '0024', 'laboratoriya', 'Laboratoriya', 'Immunoglobulinlar', 259000),
  s('65152', '0017', 'laboratoriya', 'Laboratoriya', 'Infeksiya va parazitlar', 677000),
  s('65266', '0013', 'laboratoriya', 'Laboratoriya', 'Koagulogramma', 63000),
  s('65221', '0008', 'laboratoriya', 'Laboratoriya', 'Leykogramma', 42000),
  s('65557', '0007', 'laboratoriya', 'Laboratoriya', 'Lipid profil', 178000),
  s('65583', '0031', 'laboratoriya', 'Laboratoriya', 'MAR TEST', 306000),
  s('65582', '0006', 'laboratoriya', 'Laboratoriya', 'Mikroelementlar', 278000),
  s('65580', '0004', 'laboratoriya', 'Laboratoriya', 'Neonatal skrining', 43000),
  s('65570', '0025', 'laboratoriya', 'Laboratoriya', 'PSA test', 76000),
  s('65576', '0035', 'laboratoriya', 'Laboratoriya', 'PSR panel (inson papilloma virusi)', 960000),
  s('65574', '0033', 'laboratoriya', 'Laboratoriya', 'PSR panel (qon plasmasi)', 671000),
  s('65555', '0030', 'laboratoriya', 'Laboratoriya', 'Siydik umumiy mikroskopiyasi', 26000),
  s('65554', '0029', 'laboratoriya', 'Laboratoriya', 'Siydik orqali ichak oqsili yig\'ish', 100000),
  s('65549', '0019', 'laboratoriya', 'Laboratoriya', 'Spermatozoidlarning hayotiyligini aniqlash', 198000),
  s('65540', '0037', 'laboratoriya', 'Laboratoriya', 'Spermogramma va sperma bioximiyasi', 1244000),
  s('65529', '0001', 'laboratoriya', 'Laboratoriya', 'Temirning qon zardobidagi miqdori', 100000),
  s('65524', '0021', 'laboratoriya', 'Laboratoriya', 'TORCH infeksiyalari IgM', 322000),
  s('65506', '0002', 'laboratoriya', 'Laboratoriya', 'Umumiy qon tahlili', 45000),
  s('65263', '0003', 'laboratoriya', 'Laboratoriya', 'Umumiy siydik tahlili', 26000),
  s('65582', '0043', 'laboratoriya', 'Laboratoriya', 'Urogenital MAZOQ', 56000),
  s('65581', '0038', 'laboratoriya', 'Laboratoriya', 'Urogenital MAZOQ (erkak)', 56000),
  s('65583', '0044', 'laboratoriya', 'Laboratoriya', 'Virusli yuklama (HIV / PROTAMIN)', 2600000),
  s('65560', '0011', 'laboratoriya', 'Laboratoriya', 'Vitaminlar va anemiya IXLA (CLIA)', 743000),

  s('65204', '0014', 'pullik-xizmat', 'Pullik xizmatlar', 'XVK', 16000),
  s('65244', '0086', 'pullik-xizmat', 'Pullik xizmatlar', 'Kapelnitsa quyish', 40000),
  s('65240', '0088', 'pullik-xizmat', 'Pullik xizmatlar', 'Musak ichiga ineksiya qilish', 10000),
  s('65247', '0089', 'pullik-xizmat', 'Pullik xizmatlar', 'Ozonoterapiya', 60000),
  s('65245', '0087', 'pullik-xizmat', 'Pullik xizmatlar', 'Tomir ichiga ineksiya qilish', 10000),
  s('65119', '050', 'pullik-xizmat', 'Pullik xizmatlar', 'VIP xizmati 1', 250000),
  s('65126', '051', 'pullik-xizmat', 'Pullik xizmatlar', 'VIP xizmati 2', 300000),
  s('65127', '052', 'pullik-xizmat', 'Pullik xizmatlar', 'VIP xizmati 3', 350000),

  s('65057', '001', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Endokrinolog ko\'rigi', 107000),
  s('65061', '005', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Gepatolog ko\'rigi', 77000),
  s('65060', '004', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Kardiolog ko\'rigi', 77000),
  s('65059', '003', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Nefrolog ko\'rigi', 77000),
  s('65058', '002', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Nevropatolog ko\'rigi', 77000),
  s('65062', '006', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Onkolog ko\'rigi', 77000),
  s('65085', '025', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Pediolog ko\'rigi', 77000),
  s('65099', '039', 'shifokor-korigi', 'Shifokor ko\'rigi', 'Ayollar rahbari yosh a\'zolari', 47000),

  s('65072', '016', 'uzi', 'UZI', 'Bachadon: 4 zonali UTT', 57000),
  s('65219', '081', 'uzi', 'UZI', 'Branxio-sefal arteriyalar duplex', 75000),
  s('65216', '070', 'uzi', 'UZI', 'Buyrak va qovuq', 62000),
  s('65236', '075', 'uzi', 'UZI', 'Buyrak, buyrak usti bezi, siydik pufagi va qoldiq siydik', 73000),
  s('65238', '080', 'uzi', 'UZI', 'Endokrinologiyada UZI', 87000),
  s('65237', '079', 'uzi', 'UZI', 'Follikulometriya', 40000),
  s('65070', '014', 'uzi', 'UZI', 'Jigar, taloq, UTT', 71000),
  s('65240', '082', 'uzi', 'UZI', 'Oyoq arteriyalar duplex', 87000),
  s('65243', '075', 'uzi', 'UZI', 'Plevra bo\'shlig\'i', 51000),
  s('65065', '012', 'uzi', 'UZI', 'Qalqonsimon bez UZI', 57000),
  s('65234', '076', 'uzi', 'UZI', 'Qo\'l tomirlari duplex', 87000),
  s('65241', '083', 'uzi', 'UZI', 'Qo\'l arteriyalari duplex', 87000),
  s('65090', '039', 'uzi', 'UZI', 'Sut bezlari UZI', 75000),
];

export const LABORATORY_SERVICE_ROWS: ServicePriceRow[] = filterLaboratoryPriceRows(SERVICE_PRICE_ROWS);

export const SERVICE_GROUPS: { key: ServiceGroupKey; label: string }[] = [
  { key: 'fizioterapiya', label: 'Fizioterapiya' },
  { key: 'kardiologiya', label: 'Kardiologiya' },
  { key: 'laboratoriya', label: 'Laboratoriya' },
  { key: 'pullik-xizmat', label: 'Pullik xizmatlar' },
  { key: 'shifokor-korigi', label: 'Shifokor ko\'rigi' },
  { key: 'uzi', label: 'UZI' },
];
