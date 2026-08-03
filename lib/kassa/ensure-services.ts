import { prisma } from '@/lib/kassa/prisma';
import { getDefaultClinicId } from '@/lib/server/default-clinic';
import { readClinicResourcePayload } from '@/lib/db/clinic-json-resources';
import type { ServicePriceRow } from '@/lib/services/pricing-data';

const DEFAULT_CATEGORIES = [
  'Diagnostika',
  'Laboratoriya',
  'Terapiya',
  'Jarrohlik',
  'Stomatologiya',
] as const;

const DEFAULT_SERVICES: {
  name: string;
  price: number;
  category: (typeof DEFAULT_CATEGORIES)[number];
}[] = [
  { name: 'Umumiy qon tahlili', price: 85000, category: 'Laboratoriya' },
  { name: 'EKG', price: 120000, category: 'Diagnostika' },
  { name: 'UZI qorin', price: 180000, category: 'Diagnostika' },
  { name: "Rentgen o'pkalar", price: 150000, category: 'Diagnostika' },
  { name: 'Terapevt konsultatsiya', price: 100000, category: 'Terapiya' },
  { name: 'Stomatolog konsultatsiya', price: 80000, category: 'Stomatologiya' },
  { name: 'Tish tozalash', price: 200000, category: 'Stomatologiya' },
  { name: 'IV droppa', price: 75000, category: 'Terapiya' },
];

function asPriceRows(raw: unknown): ServicePriceRow[] {
  if (!Array.isArray(raw)) return [];
  const out: ServicePriceRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const price = typeof r.price === 'number' ? r.price : Number(r.price);
    const groupLabel =
      typeof r.groupLabel === 'string' ? r.groupLabel.trim() : 'Boshqa';
    if (!name || !Number.isFinite(price) || price <= 0) continue;
    out.push({
      id: typeof r.id === 'string' ? r.id : name,
      code: typeof r.code === 'string' ? r.code : name,
      group:
        typeof r.group === 'string' ?
          (r.group as ServicePriceRow['group'])
        : 'pullik-xizmat',
      groupLabel: groupLabel || 'Boshqa',
      name,
      price,
    });
  }
  return out;
}

async function upsertCategory(name: string): Promise<string> {
  const trimmed = name.trim() || 'Boshqa';
  const cat = await prisma.serviceCategory.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed },
  });
  return cat.id;
}

async function seedDefaultServices(): Promise<number> {
  const catMap = new Map<string, string>();
  for (const name of DEFAULT_CATEGORIES) {
    catMap.set(name, await upsertCategory(name));
  }

  let created = 0;
  for (const service of DEFAULT_SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (existing) {
      if (!existing.isActive || Number(existing.price) !== service.price) {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            price: service.price,
            categoryId: catMap.get(service.category) ?? existing.categoryId,
          },
        });
      }
      continue;
    }
    await prisma.service.create({
      data: {
        name: service.name,
        price: service.price,
        categoryId: catMap.get(service.category),
        isActive: true,
      },
    });
    created += 1;
  }
  return created;
}

async function syncFromClinicPrices(rows: ServicePriceRow[]): Promise<number> {
  let created = 0;
  for (const row of rows) {
    const categoryId = await upsertCategory(row.groupLabel || 'Boshqa');
    const existing = await prisma.service.findFirst({
      where: { name: row.name },
    });
    if (existing) {
      if (
        !existing.isActive ||
        Number(existing.price) !== row.price ||
        existing.categoryId !== categoryId
      ) {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            price: row.price,
            categoryId,
          },
        });
      }
      continue;
    }
    await prisma.service.create({
      data: {
        name: row.name,
        price: row.price,
        categoryId,
        isActive: true,
      },
    });
    created += 1;
  }
  return created;
}

/** Kassa xizmatlari bo'sh bo'lsa klinika katalogi yoki standart ro'yxatdan to'ldiradi */
export async function ensureKassaServicesAvailable(): Promise<void> {
  const activeCount = await prisma.service.count({ where: { isActive: true } });
  if (activeCount > 0) return;

  const inactiveOnly = await prisma.service.count({ where: { isActive: false } });
  if (inactiveOnly > 0) {
    await prisma.service.updateMany({
      where: { isActive: false },
      data: { isActive: true },
    });
    return;
  }

  try {
    const clinicId = await getDefaultClinicId();
    const raw = await readClinicResourcePayload(clinicId, 'service-prices');
    const priceRows = asPriceRows(raw).filter((row) => row.price > 0);
    if (priceRows.length > 0) {
      await syncFromClinicPrices(priceRows);
      return;
    }
  } catch (error) {
    console.warn('ensureKassaServicesAvailable: clinic service-prices', error);
  }

  await seedDefaultServices();
}
