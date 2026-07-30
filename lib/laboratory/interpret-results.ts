import { parseCatalogRef } from '@/lib/laboratory/catalog-types';
import { adviceForItem } from '@/lib/laboratory/lab-advice-rules';
import {
  compareNumericToNorm,
  compareQualitativeToNorm,
  formatDeviation,
  parseNormComparison,
  parseNumericLabValue,
  resolveNormText,
  type CompareStatus,
} from '@/lib/laboratory/parse-lab-value';
import type { ResolvedLabOrder } from '@/lib/patients/resolve-order-labels';

export type LabResultInterpretation = {
  orderKey: string;
  itemId: string | null;
  label: string;
  categoryTitle?: string;
  value: string;
  numericValue: number | null;
  norm: string;
  unit?: string;
  status: CompareStatus;
  deviation?: string;
  advice: string;
};

export type LabInterpretationSummary = {
  items: LabResultInterpretation[];
  abnormalItems: LabResultInterpretation[];
  normalCount: number;
  abnormalCount: number;
  unknownCount: number;
  /** Umumiy klinik maslahatlar (bir nechta tahlil kombinatsiyasi) */
  clinicalHints: string[];
  /** Qisqa xulosa */
  overview: string;
  disclaimer: string;
};

export type InterpretLaboratoryInput = {
  orders: ResolvedLabOrder[];
  valuesByKey: Record<string, string>;
  gender?: string;
  diseaseType?: string;
};

function buildClinicalHints(
  abnormal: LabResultInterpretation[],
  diseaseType?: string,
): string[] {
  const hints: string[] = [];
  const byId = new Map(
    abnormal.filter((a) => a.itemId).map((a) => [a.itemId!, a] as const),
  );
  const has = (id: string) => byId.has(id);
  const status = (id: string) => byId.get(id)?.status;

  if (
    (has('glu') && status('glu') === 'high') ||
    (has('glu_u') && status('glu_u') === 'abnormal')
  ) {
    hints.push(
      'Glyukoza/yallig‘lanish belgilari — diabet skriningi (HbA1c, OGTT) va ovqatlanish rejasini ko‘rib chiqing.',
    );
  }

  if (has('tsh') && (status('tsh') === 'high' || status('tsh') === 'low')) {
    hints.push(
      'Qalqonsimon bez disfunksiyasi ehtimoli — TSH, FT4/FT3 va anti-TPO dinamikasini birgalikda baholang.',
    );
  }

  if (
    (has('chol') && status('chol') === 'high') ||
    (has('ldl') && status('ldl') === 'high') ||
    (has('tg') && status('tg') === 'high')
  ) {
    hints.push(
      'Dislipidemiya belgilari — kardiovaskulyar xavf, ovqatlanish va statin/lifestyle intervensiya ko‘rib chiqilishi mumkin.',
    );
  }

  if (
    (has('alt') && status('alt') === 'high') ||
    (has('ast') && status('ast') === 'high')
  ) {
    hints.push(
      'Jigar fermentlari oshgan — alkogol, dori ta’siri, steatoz va virus gepatitlarni istisno qiling.',
    );
  }

  if (has('hgb') && status('hgb') === 'low') {
    hints.push(
      'Anemiya ehtimoli — temir, ferritin, B12/folat va gemoliz sabablarini tekshirish rejalashtiring.',
    );
  }

  // Umumiy siydik / Nechiporenko — infeksiya / yallig‘lanish
  const urineInfection =
    (has('bld') && (status('bld') === 'high' || status('bld') === 'abnormal')) ||
    (has('pro') && status('pro') === 'abnormal') ||
    (has('n_leu') && status('n_leu') === 'high') ||
    (has('n_ery') && status('n_ery') === 'high') ||
    (has('nit') && status('nit') === 'abnormal') ||
    (has('leu_u') && (status('leu_u') === 'high' || status('leu_u') === 'abnormal'));

  if (urineInfection) {
    hints.push(
      'Siydik tahlilida yallig‘lanish/infeksiya belgilari — klinik belgilar (shamollash, dizuriya) bilan solishtiring; buyrak va siydik pufagi UZI ko‘rigi tavsiya etilishi mumkin.',
    );
  }

  if (has('cr') && status('cr') === 'high') {
    hints.push(
      'Nefrologik funksiya buzilishi ehtimoli — arterial bosim, suv balansi va nefrotoksik dori qabul qilishni baholang.',
    );
  }

  if (has('crp') && status('crp') === 'high') {
    hints.push(
      'Yallig‘lanish belgisi — infeksiya o‘chog‘i, autoimmun jarayon yoki postoperativ reaksiyani klinik bilan solishtiring.',
    );
  }

  const d = (diseaseType ?? '').toLowerCase();
  if (d.includes('diabet') && (has('glu') || has('glu_u'))) {
    hints.push(
      'Bemor diabet profilida — glyukoza natijalarini HbA1c va ovqatlanish/rejim bilan birgalikda baholang.',
    );
  }
  if (
    (d.includes('tireotoksikoz') || d.includes('gipotireoz') || d.includes('hashimoto')) &&
    (has('tsh') || has('ft4') || has('atpo'))
  ) {
    hints.push(
      'Endokrinologik kasallik anamnezi mavjud — tahlil natijalarini oldingi va reja terapiya bilan solishtiring.',
    );
  }

  if (abnormal.length >= 3 && hints.length === 0) {
    hints.push(
      "Bir nechta ko‘rsatkich me'yordan chetga chiqqan — bemor holati, dori va klinik belgilar bilan kompleks baho tavsiya etiladi.",
    );
  }

  return [...new Set(hints)];
}

function interpretSingle(
  order: ResolvedLabOrder,
  value: string,
  gender?: string,
): LabResultInterpretation {
  const parsed = parseCatalogRef(order.key);
  const itemId = parsed?.itemId ?? null;
  const normRaw = order.norm ?? '';
  const resolvedNorm = resolveNormText(normRaw, gender);
  const normCmp = parseNormComparison(resolvedNorm);

  let status: CompareStatus = 'unknown';
  let numericValue: number | null = null;
  let deviation: string | undefined;

  if (normCmp.kind === 'qualitative') {
    status = compareQualitativeToNorm(value);
  } else {
    numericValue = parseNumericLabValue(value);
    if (numericValue !== null && normCmp.kind !== 'unknown') {
      status = compareNumericToNorm(numericValue, normCmp);
      deviation = formatDeviation(numericValue, status, normCmp);
    }
  }

  return {
    orderKey: order.key,
    itemId,
    label: order.label,
    categoryTitle: order.categoryTitle,
    value: value.trim(),
    numericValue,
    norm: resolvedNorm || normRaw || '—',
    unit: order.unit,
    status,
    deviation,
    advice: adviceForItem(itemId, status, order.label),
  };
}

export function interpretLaboratoryResults(
  input: InterpretLaboratoryInput,
): LabInterpretationSummary {
  const items: LabResultInterpretation[] = [];

  for (const order of input.orders) {
    const value = input.valuesByKey[order.key]?.trim() ?? '';
    if (!value) continue;
    items.push(interpretSingle(order, value, input.gender));
  }

  const abnormalItems = items.filter(
    (i) => i.status === 'high' || i.status === 'low' || i.status === 'abnormal',
  );
  const normalCount = items.filter((i) => i.status === 'normal').length;
  const unknownCount = items.filter((i) => i.status === 'unknown').length;

  const clinicalHints = buildClinicalHints(abnormalItems, input.diseaseType);

  let overview: string;
  if (items.length === 0) {
    overview = 'Tahlil natijalari hali kiritilmagan.';
  } else if (abnormalItems.length === 0 && unknownCount === 0) {
    overview = `Barcha ${items.length} ta kiritilgan ko‘rsatkich me'yor doirasida.`;
  } else if (abnormalItems.length === 0) {
    overview = `${normalCount} ta ko‘rsatkich me'yorda; ${unknownCount} tasini avtomatik baholab bo‘lmadi.`;
  } else {
    overview = `${abnormalItems.length} ta ko‘rsatkich me'yordan chetga chiqqan, ${normalCount} tasi me'yorda.`;
  }

  return {
    items,
    abnormalItems,
    normalCount,
    abnormalCount: abnormalItems.length,
    unknownCount,
    clinicalHints,
    overview,
    disclaimer:
      'Bu avtomatik tahlil yordamchi maslahat hisoblanadi. Yakuniy tashxis, davolash va qo‘shimcha tekshiruvlar shifokor tomonidan belgilanadi.',
  };
}
