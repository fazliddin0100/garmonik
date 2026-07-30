import { catalogRef } from './catalog-types';
import type { LabCategory } from './catalog-types';

/** Kasallik turiga qarab tavsiya etiladigan katalog pozitsiyalari */
export function suggestedCatalogRefs(diseaseType: string, catalog: LabCategory[]): string[] {
  const d = diseaseType.toLowerCase();
  const refs = new Set<string>();

  function ref(catId: string, itemId: string) {
    if (catalog.some((c) => c.id === catId && c.items.some((i) => i.id === itemId))) {
      refs.add(catalogRef(catId, itemId));
    }
  }

  function catAll(catId: string) {
    const c = catalog.find((x) => x.id === catId);
    if (!c) return;
    for (const it of c.items) refs.add(catalogRef(catId, it.id));
  }

  if (d.includes('diabet')) {
    catAll('qon_umumiy');
    catAll('biokimyoviy');
    catAll('lipidlar');
    ref('siydik_umumiy', 'glu_u');
  } else if (d.includes('tireotoksikoz') || d.includes('gipotireoz') || d.includes('hashimoto')) {
    catAll('qon_umumiy');
    catAll('qalqonsimon');
  } else if (d.includes('polikistik') || d.includes('pcos')) {
    catAll('reproduktiv');
    catAll('lipidlar');
    catAll('biokimyoviy');
  } else if (d.includes('semirish') || d.includes('obesitet')) {
    catAll('lipidlar');
    catAll('biokimyoviy');
    catAll('mikroelementlar');
  } else if (d.includes('osteoporoz')) {
    catAll('mikroelementlar');
    catAll('biokimyoviy');
  } else if (d.includes('metabolik') || d.includes('gipertoniya')) {
    catAll('lipidlar');
    catAll('biokimyoviy');
    catAll('koagulogramma');
    catAll('qon_umumiy');
  } else if (d.includes('nevropatiya')) {
    catAll('qon_umumiy');
    catAll('biokimyoviy');
  } else if (d.includes('bolalar endokrin')) {
    catAll('qon_umumiy');
    catAll('qalqonsimon');
  } else if (d.includes('profilaktik')) {
    catAll('qon_umumiy');
    catAll('lipidlar');
    catAll('siydik_umumiy');
  } else {
    ref('qon_umumiy', 'wbc');
    ref('qon_umumiy', 'hgb');
    ref('siydik_umumiy', 'sg');
  }

  return [...refs];
}
