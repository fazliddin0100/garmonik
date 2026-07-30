import { servicePriceKey, type ServicePriceRow } from '@/lib/services/pricing-data';

/** Kasallik turi matni bo‘yicha tavsiya etiladigan laboratoriya xizmat kalitlari (`id-kod`) */
export function suggestedLabServiceKeys(diseaseType: string, laboratoryRows: ServicePriceRow[]): string[] {
  const d = diseaseType.toLowerCase();
  const keys = new Set<string>();

  function addByName(...needles: string[]) {
    for (const row of laboratoryRows) {
      const n = row.name.toLowerCase();
      if (needles.some((needle) => n.includes(needle.toLowerCase()))) {
        keys.add(servicePriceKey(row));
      }
    }
  }

  if (d.includes('diabet')) {
    addByName('umumiy qon', 'glyukoza tolerant', 'homa', 'lipid profil', 'umumiy siydik');
  } else if (d.includes('tireotoksikoz') || d.includes('gipotireoz') || d.includes('hashimoto')) {
    addByName('umumiy qon', 'gormonlar', 'leykogramma', 'eritrosit cho', 'immunoglobulinlar');
  } else if (d.includes('polikistik') || d.includes('pcos')) {
    addByName('gormonlar', 'lipid profil', 'glyukoza tolerant', 'umumiy qon');
  } else if (d.includes('semirish') || d.includes('obesitet')) {
    addByName('lipid profil', 'glyukoza tolerant', 'homa', 'umumiy qon', 'mikroelementlar');
  } else if (d.includes('osteoporoz')) {
    addByName('vitaminlar va anemiya', 'mikroelementlar', 'temirning qon');
  } else if (d.includes('metabolik') || d.includes('gipertoniya')) {
    addByName('lipid profil', 'homa', 'glyukoza tolerant', 'umumiy qon', 'koagulogramma');
  } else if (d.includes('nevropatiya')) {
    addByName('umumiy qon', 'glyukoza tolerant', 'mikroelementlar');
  } else if (d.includes('bolalar endokrin')) {
    addByName('umumiy qon', 'gormonlar', 'leykogramma');
  } else if (d.includes('profilaktik')) {
    addByName('umumiy qon', 'lipid profil', 'umumiy siydik', 'leykogramma');
  } else {
    addByName('umumiy qon', 'umumiy siydik', 'leykogramma');
  }

  return [...keys];
}

export function labRowByServiceKey(key: string, laboratoryRows: ServicePriceRow[]): ServicePriceRow | undefined {
  return laboratoryRows.find((r) => servicePriceKey(r) === key);
}
