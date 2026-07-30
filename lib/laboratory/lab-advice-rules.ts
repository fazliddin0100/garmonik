import type { CompareStatus } from './parse-lab-value';

export type LabAdviceRule = {
  high?: string;
  low?: string;
  abnormal?: string;
  normal?: string;
  unknown?: string;
};

/** Katalog `item.id` bo'yicha klinik maslahat qoidalari */
export const LAB_ADVICE_BY_ITEM_ID: Record<string, LabAdviceRule> = {
  glu: {
    high:
      'Glyukoza oshgan — och qorin holatida qayta o‘lchash, HbA1c va OGTT ni ko‘rib chiqish tavsiya etiladi. Dieta va jismoniy faollikni baholang.',
    low: 'Gipoglikemiya ehtimoli — bemor holati, insulin/oral gipoglikemik dori va ovqatlanish vaqtini tekshiring.',
  },
  tsh: {
    high:
      'TSH oshgan — gipotireoz, subklinik gipotireoz yoki dori dozasi yetishmasligi ehtimoli. Erkin T4/T3 va anti-TPO bilan birga baholang.',
    low: 'TSH pasaygan — giperterioz yoki ortiqcha L-tiroksin ehtimoli. Yurak ritmi, FT4 va klinik belgilarni tekshiring.',
  },
  ft4: {
    high: 'Erkin T4 oshgan — giperterioz belgilari va TSH bilan birgalikda qalqonsimon bez funksiyasini qayta baholang.',
    low: 'Erkin T4 pasaygan — gipotireoz yoki yetarli emas L-tiroksin terapiyasi ehtimoli.',
  },
  ft3: {
    high: 'Erkin T3 oshgan — tireotoksikoz belgilari va TSH/FT4 bilan solishtiring.',
    low: 'Erkin T3 pasaygan — euthyroid kasallik sindromi yoki og‘ir gipotireoz ehtimoli.',
  },
  atpo: {
    high: 'Anti-TPO oshgan — Hashimoto tireoiditi yoki autoimmun patologiya ehtimoli. TSH dinamikasini kuzatish maqsadga muvofiq.',
  },
  hgb: {
    low: 'Anemiya ehtimoli — temir, B12, folat va gemoliz sabablarini ko‘rib chiqing; klinik belgilar va gematokrit bilan birga baholang.',
    high: 'Gemoglobin oshgan — gemokonsentratsiya, KOPD yoki eritrotsitoz ehtimoli; suv-elektrolit balansini tekshiring.',
  },
  hct: {
    low: 'Gematokrit pasaygan — anemiya yoki gemodilutsiya ehtimoli.',
    high: 'Gematokrit oshgan — gemokonsentratsiya yoki eritrotsitoz ehtimoli.',
  },
  wbc: {
    high: 'Leykotsitoz — infeksiya, yallig‘lanish yoki stress reaksiyasi ehtimoli; klinik kontekst bilan solishtiring.',
    low: 'Leykopeniya — virus infeksiyasi, dori ta’siri yoki gematologik sabab ehtimoli.',
  },
  plt: {
    high: 'Trombotsitoz — yallig‘lanish, temir yetishmovchiligi yoki mieloproliferativ jarayon ehtimoli.',
    low: 'Trombotsitopeniya — qon ketish xavfi; dori ta’siri va infeksiyani istisno qiling.',
  },
  esr: {
    high: 'SOE oshgan — yallig‘lanish, infeksiya yoki autoimmun jarayon ehtimoli; CRP bilan birga baholang.',
  },
  alt: {
    high: 'ALT oshgan — gepatotsit zararlanishi (steatoz, virus gepatit, dori ta’siri) ehtimoli. AST va klinik belgilarni solishtiring.',
  },
  ast: {
    high: 'AST oshgan — jigar yoki mushak/yurak zararlanishi ehtimoli; ALT nisbati (De Ritis) foydali bo‘lishi mumkin.',
  },
  cr: {
    high: 'Kreatinin oshgan — nefrologik funksiya pasayishi ehtimoli; suv balansi, arterial bosim va dori dozasini baholang.',
    low: 'Kreatinin pasaygan — mushak massasi kam yoki gemodilutsiya ehtimoli; klinik kontekst muhim.',
  },
  urea: {
    high: 'Mochevina oshgan — nefrologik yoki giperproteik ovqatlanish, gemodilutsiya ehtimoli.',
    low: 'Mochevina pasaygan — jetishmovchi ovqatlanish yoki jigar funksiyasi pasayishi ehtimoli.',
  },
  chol: {
    high: 'Umumiy xolesterin oshgan — kardiovaskulyar xavf; LDL, HDL, triglitserid va ovqatlanish/turmush tarzi maslahatini ko‘rib chiqing.',
  },
  ldl: {
    high: 'LDL oshgan — ateroskleroz xavfi; statin/ind lifestyle intervensiya ko‘rib chiqilishi mumkin.',
  },
  hdl: {
    low: 'HDL pasaygan — kardiovaskulyar xavf oshgan; jismoniy faollik va ovqatlanishni baholang.',
  },
  tg: {
    high: 'Triglitseridlar oshgan — metabolik sindrom, diabet yoki gemodilutsiya ehtimoli; glyukoza va ovqatlanishni tekshiring.',
  },
  crp: {
    high: 'CRP oshgan — faol yallig‘lanish yoki infeksiya ehtimoli; klinik belgilar bilan birga baholang.',
  },
  fe: {
    low: 'Temir pasaygan — temir yetishmovchiligi anemiyasi ehtimoli; gemoglobin va ferritin bilan birga baholang.',
    high: 'Temir oshgan — gemoxromatoz yoki ortiqcha temir qabul qilish ehtimoli.',
  },
  ca: {
    high: 'Kalsiy oshgan — giperparatiroidizm yoki D vitamini ortiqchaligi ehtimoli.',
    low: 'Kalsiy pasaygan — D vitamini yoki paratiroid funksiyasi buzilishi ehtimoli.',
  },
  glu_u: {
    abnormal:
      'Siydikda glyukoza aniqlangan — diabet yoki renal glyukozuriya ehtimoli; qon glyukozasi va HbA1c ni tekshiring.',
  },
  pro: {
    abnormal:
      'Siydikda oqsil — nefrotik sindrom, infeksiya yoki gipertoniya ehtimoli; qayta tahlil va nefrologik baho tavsiya etiladi.',
  },
  ket: {
    abnormal:
      'Ketonlar musbat — diabetik ketoatsidoz yoki ochlik/ketogen dieta ehtimoli; glyukoza va klinik holatni darhol baholang.',
  },
  bld: {
    high: 'Siydikda eritrotsitlar oshgan — gematuriya; tosh, infeksiya yoki yallig‘lanish ehtimoli. UZI ko‘rigi tavsiya etilishi mumkin.',
    abnormal:
      'Siydikda qon aniqlandi — gematuriya sababini aniqlash; UZI va qayta tahlil tavsiya etiladi.',
  },
  bil: {
    abnormal:
      'Siydikda bilirubin musbat — jigar/o‘t yo‘llari patologiyasi ehtimoli; qon bilirubini va UZI ko‘rib chiqing.',
  },
  uro: {
    high: 'Urobilinogen oshgan — gemoliz yoki jigar funksiyasi buzilishi ehtimoli.',
  },
  n_leu: {
    high: 'Nechiporenko: leykotsitlar oshgan — siydik yo‘llari infeksiyasi/yallig‘lanish ehtimoli; klinik belgilar va UZI tavsiya etilishi mumkin.',
  },
  n_ery: {
    high: 'Nechiporenko: eritrotsitlar oshgan — gematuriya; tosh yoki yallig‘lanish ehtimoli, UZI ko‘rigi ko‘rib chiqiladi.',
  },
  n_cyl: {
    high: 'Nechiporenko: silindrlar oshgan — buyrak parenxima jarayoni ehtimoli; nefrologik baho tavsiya etiladi.',
  },
  neu: {
    high: 'Neutrofillar oshgan — bakterial infeksiya yoki yallig‘lanish ehtimoli.',
    low: 'Neutropeniya — virus infeksiyasi yoki dori ta’siri ehtimoli.',
  },
  lym: {
    high: 'Limfotsitoz — virus infeksiyasi ehtimoli.',
    low: 'Limfopeniya — stress, virus yoki immun tanqislik ehtimoli.',
  },
  rbc: {
    low: 'Eritrotsitlar pasaygan — anemiya ehtimoli; gemoglobin bilan birga baholang.',
    high: 'Eritrotsitoz — gemokonsentratsiya yoki gipoksiya ehtimoli.',
  },
  mcv: {
    low: 'MCV past — mikrotsitar anemiya (temir yetishmovchiligi) ehtimoli.',
    high: 'MCV yuqori — makrotsitar anemiya (B12/folat) ehtimoli.',
  },
  bil_u: {
    high: 'Umumiy bilirubin oshgan — jigar/o‘t yo‘llari yoki gemoliz ehtimoli; UZI va fraksiyalar bilan baholang.',
  },
  hbs: {
    abnormal: 'HBsAg musbat — xronik gepatit B ehtimoli; virusologik va gepatologik tekshiruvlar rejalashtiring.',
  },
  hcv: {
    abnormal: 'Anti-HCV musbat — gepatit C infeksiyasi ehtimoli; RNA va gepatologik baho tavsiya etiladi.',
  },
  hiv: {
    abnormal: 'HIV skrining musbat — tasdiqlovchi test va infeksion nazorat protokoli talab etiladi.',
  },
};

export function adviceForItem(
  itemId: string | null,
  status: CompareStatus,
  label: string,
): string {
  const rule = itemId ? LAB_ADVICE_BY_ITEM_ID[itemId] : undefined;
  if (status === 'high' && rule?.high) return rule.high;
  if (status === 'low' && rule?.low) return rule.low;
  if (status === 'abnormal' && rule?.abnormal) return rule.abnormal;
  if (status === 'normal' && rule?.normal) return rule.normal;

  if (status === 'high') {
    return `${label} me'yordan yuqori — klinik belgilar va qayta tahlil bilan birga baholang.`;
  }
  if (status === 'low') {
    return `${label} me'yordan past — klinik belgilar va qayta tahlil bilan birga baholang.`;
  }
  if (status === 'abnormal') {
    return `${label} natijasi kutilmagan — tasdiqlovchi tekshiruv va klinik baho tavsiya etiladi.`;
  }
  if (status === 'normal') {
    return `${label} me'yor doirasida.`;
  }
  return `${label} uchun avtomatik solishtirish mumkin emas — shifokor qo‘lda baholashi kerak.`;
}
