import type { LabCategory } from './catalog-types';

/** Klinika laboratoriya blankasi bo‘yicha turkumlar va tahlillar (nom, me’yor, birlik) */
export const INITIAL_LAB_CATALOG: LabCategory[] = [
  {
    id: 'qon_umumiy',
    title: 'Umumiy qon tahlili va ECHT (SOE)',
    items: [
      { id: 'wbc', name: 'Leykotsitlar', norm: '4,0–9,0', unit: '10⁹/l' },
      { id: 'neu', name: 'Neutrofillar', norm: '47–72', unit: '%' },
      { id: 'lym', name: 'Limfotsitlar', norm: '19–37', unit: '%' },
      { id: 'mon', name: 'Monotsitlar', norm: '3–11', unit: '%' },
      { id: 'eos', name: 'Eozinofillar', norm: '0,5–5', unit: '%' },
      { id: 'bas', name: 'Bazofillar', norm: '0–1', unit: '%' },
      { id: 'rbc', name: 'Eritrotsitlar', norm: '3,9–5,5 (A); 3,7–4,7 (A)', unit: '10¹²/l' },
      { id: 'hgb', name: 'Gemoglobin', norm: '120–160 (A); 110–150 (A)', unit: 'g/l' },
      { id: 'hct', name: 'Gematokrit', norm: '36–48', unit: '%' },
      { id: 'mcv', name: 'Eritrotsitlar o‘rtacha hajmi (MCV)', norm: '80–99', unit: 'fl' },
      { id: 'plt', name: 'Trombotsitlar', norm: '150–400', unit: '10⁹/l' },
      { id: 'esr', name: 'Eritrotsitlar cho‘kish tezligi (SOE, ECHT)', norm: '2–15 (A); 2–20 (A)', unit: 'mm/soat' },
    ],
  },
  {
    id: 'qon_ivish',
    title: 'VSK (qon ivish vaqti)',
    items: [
      { id: 'vsk_bosh', name: 'Boshlanishi', norm: '—', unit: 'daq' },
      { id: 'vsk_tug', name: 'Tugashi', norm: '5–10', unit: 'daq' },
    ],
  },
  {
    id: 'qon_gruppa',
    title: 'Qon guruhi va Rezus faktor',
    items: [
      { id: 'abo', name: 'Qon guruhi', norm: '—', unit: '—' },
      { id: 'rh', name: 'Rezus faktor', norm: '—', unit: '—' },
    ],
  },
  {
    id: 'siydik_umumiy',
    title: 'Umumiy siydik tahlili',
    items: [
      { id: 'uro', name: 'Urobilinogen', norm: '0,2–1,0', unit: 'mg/dl' },
      { id: 'bil', name: 'Bilirubin', norm: 'manfiy', unit: '—' },
      { id: 'ket', name: 'Keton', norm: 'manfiy', unit: '—' },
      { id: 'cr_u', name: 'Kreatinin', norm: '26–133', unit: 'mg/dl' },
      { id: 'bld', name: 'Qon (eritrotsitlar)', norm: '0–2', unit: '/mayda' },
      { id: 'pro', name: 'Oqsil', norm: 'manfiy', unit: '—' },
      { id: 'glu_u', name: 'Glyukoza', norm: 'manfiy', unit: '—' },
      { id: 'sg', name: 'Nisbiy zichlik', norm: '1,003–1,035', unit: '—' },
      { id: 'ph', name: 'pH', norm: '5,0–8,0', unit: '—' },
    ],
  },
  {
    id: 'nechiporenko',
    title: 'Nechiporenko sinovasi',
    items: [
      { id: 'n_leu', name: 'Leykotsitlar', norm: '<2000', unit: '1/ml' },
      { id: 'n_ery', name: 'Eritrotsitlar', norm: '<1000', unit: '1/ml' },
      { id: 'n_cyl', name: 'Silindrlar', norm: '0–20', unit: '1/ml' },
    ],
  },
  {
    id: 'koagulogramma',
    title: 'Koagulogramma',
    items: [
      { id: 'pt', name: 'Protrombin vaqti', norm: '11–16', unit: 'son' },
      { id: 'inr', name: 'MNO (INR)', norm: '0,85–1,15', unit: '—' },
      { id: 'tt', name: 'Trombin vaqti', norm: '14–21', unit: 'son' },
    ],
  },
  {
    id: 'biokimyoviy',
    title: 'Biokimyoviy tahlillar',
    items: [
      { id: 'bil_u', name: 'Umumiy bilirubin', norm: '3,4–20,5', unit: 'mkmol/l' },
      { id: 'alt', name: 'ALT', norm: '7–40', unit: 'unit/l' },
      { id: 'ast', name: 'AST', norm: '10–40', unit: 'unit/l' },
      { id: 'cr', name: 'Kreatinin', norm: '62–115 (A); 53–97 (A)', unit: 'mkmol/l' },
      { id: 'urea', name: 'Mochevina', norm: '2,5–8,3', unit: 'mmol/l' },
      { id: 'glu', name: 'Glyukoza', norm: '3,3–5,5', unit: 'mmol/l' },
      { id: 'tp', name: 'Umumiy oqsil', norm: '64–83', unit: 'g/l' },
      { id: 'alb', name: 'Albumin', norm: '35–50', unit: 'g/l' },
    ],
  },
  {
    id: 'mikroelementlar',
    title: 'Mikroelementlar',
    items: [
      { id: 'ca', name: 'Kalsiy', norm: '2,15–2,55', unit: 'mmol/l' },
      { id: 'mg', name: 'Magniy', norm: '0,66–1,07', unit: 'mmol/l' },
      { id: 'fe', name: 'Temir', norm: '9–30 (A); 7–27 (A)', unit: 'mkmol/l' },
      { id: 'zn', name: 'Sink', norm: '11–18', unit: 'mkmol/l' },
    ],
  },
  {
    id: 'lipidlar',
    title: 'Lipidlar spektri',
    items: [
      { id: 'chol', name: 'Xolesterin', norm: '<5,2', unit: 'mmol/l' },
      { id: 'hdl', name: 'Xolesterin LPVP', norm: '>1,0 (A); >1,2 (A)', unit: 'mmol/l' },
      { id: 'ldl', name: 'Xolesterin LPNP', norm: '<3,0', unit: 'mmol/l' },
      { id: 'tg', name: 'Triglitseridlar', norm: '<1,7', unit: 'mmol/l' },
    ],
  },
  {
    id: 'revmoproba',
    title: 'Revmoproba',
    items: [
      { id: 'crp', name: 'C-reaktiv oqsil', norm: '<5', unit: 'mg/l' },
      { id: 'aso', name: 'Antistreptolizin-O', norm: '<200', unit: 'IU/ml' },
      { id: 'rf', name: 'Revmatoid omil', norm: '<14', unit: 'IU/ml' },
    ],
  },
  {
    id: 'qalqonsimon',
    title: 'Qalqonsimon bez gormonlari (ELISA)',
    items: [
      { id: 'tsh', name: 'TSH', norm: '0,4–4,0', unit: 'mIU/l' },
      { id: 'ft4', name: 'Erkin T4', norm: '9–19', unit: 'pmol/l' },
      { id: 'ft3', name: 'Erkin T3', norm: '2,6–5,7', unit: 'pmol/l' },
      { id: 'atpo', name: 'Anti-TPO', norm: '<34', unit: 'IU/ml' },
    ],
  },
  {
    id: 'reproduktiv',
    title: 'Reproduktiv gormonlar (ELISA)',
    items: [
      { id: 'fsh', name: 'FSH', norm: 'faza bo‘yicha', unit: 'IU/l' },
      { id: 'lh', name: 'LH', norm: 'faza bo‘yicha', unit: 'IU/l' },
      { id: 'prl', name: 'Prolaktin', norm: '2,8–14,4 (A); 109–562 (A)', unit: 'ng/ml / mIU/l' },
      { id: 'e2', name: 'Estradiol', norm: 'faza bo‘yicha', unit: 'pg/ml' },
    ],
  },
  {
    id: 'torch',
    title: 'TORCH infeksiyalari (IFA)',
    items: [
      { id: 'toxo', name: 'Toxoplasma IgM/IgG', norm: 'manfiy', unit: '—' },
      { id: 'rub', name: 'Rubella IgM/IgG', norm: 'manfiy', unit: '—' },
      { id: 'cmv', name: 'CMV IgM/IgG', norm: 'manfiy', unit: '—' },
    ],
  },
  {
    id: 'infeksiya',
    title: 'Infeksiya tahlillari',
    items: [
      { id: 'hbs', name: 'Gepatit B (HBsAg)', norm: 'manfiy', unit: '—' },
      { id: 'hcv', name: 'Gepatit C (anti-HCV)', norm: 'manfiy', unit: '—' },
      { id: 'hiv', name: 'HIV', norm: 'manfiy', unit: '—' },
    ],
  },
  {
    id: 'covid',
    title: 'COVID-19 tahlillari',
    items: [
      { id: 'pcr', name: 'PCR SARS-CoV-2', norm: 'aniqlanmagan', unit: '—' },
      { id: 'ag', name: 'Antigen test', norm: 'manfiy', unit: '—' },
    ],
  },
];
