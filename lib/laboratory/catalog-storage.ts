import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import type { LabCategory } from './catalog-types';

/** Ma’lumotlar MongoDBda (`lab-catalog` kaliti bilan) */
export async function loadLabCatalog(): Promise<LabCategory[]> {
  return fetchClinicResource<LabCategory[]>('lab-catalog');
}

export async function saveLabCatalog(catalog: LabCategory[]): Promise<void> {
  await saveClinicResource('lab-catalog', catalog);
}
