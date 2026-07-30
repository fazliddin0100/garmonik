import { prisma } from "./prisma";

export const ADDON_SERVICE_NAME = "Qo'shimcha xizmat";

export function getInvoiceItemLabel(item: {
  customLabel?: string | null;
  service: { name: string };
}): string {
  return item.customLabel?.trim() || item.service.name;
}

export async function getAddonService() {
  const existing = await prisma.service.findFirst({
    where: { name: ADDON_SERVICE_NAME, isActive: true },
  });
  if (existing) return existing;

  const category = await prisma.serviceCategory.upsert({
    where: { name: "Boshqa" },
    update: {},
    create: { name: "Boshqa" },
  });

  return prisma.service.create({
    data: {
      name: ADDON_SERVICE_NAME,
      price: 0,
      categoryId: category.id,
      isActive: true,
    },
  });
}
