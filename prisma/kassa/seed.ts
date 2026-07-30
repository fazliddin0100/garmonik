import { config } from "dotenv";
import { PrismaClient, PaymentPlatform, UserRole } from ".prisma/kassa-client";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const cashierHash = await bcrypt.hash("kassir123", 12);

  await prisma.clinicSettings.upsert({
    where: { id: "default" },
    update: {
      name: process.env.NEXT_PUBLIC_CLINIC_NAME || "Gormonik Plus Klinik",
      address: "200103, Bukhara region, Bukhara, highway Gazli",
    },
    create: {
      id: "default",
      name: process.env.NEXT_PUBLIC_CLINIC_NAME || "Gormonik Plus Klinik",
      address: "200103, Bukhara region, Bukhara, highway Gazli",
      phone: "+998 71 000 00 00",
    },
  });

  await prisma.user.upsert({
    where: { login: "admin@klinika" },
    update: {
      passwordHash: adminHash,
      fullName: "Administrator",
      role: UserRole.ADMIN,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      login: "admin@klinika",
      passwordHash: adminHash,
      fullName: "Administrator",
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { login: "kassir1" },
    update: {
      passwordHash: cashierHash,
      fullName: "Dilnoza Karimova",
      role: UserRole.CASHIER,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      login: "kassir1",
      passwordHash: cashierHash,
      fullName: "Dilnoza Karimova",
      role: UserRole.CASHIER,
    },
  });

  const paymentTypes = [
    { name: "Naqt pul", platform: PaymentPlatform.CASH, sortOrder: 1 },
    { name: "Terminal (Humo)", platform: PaymentPlatform.HUMO, sortOrder: 2 },
    { name: "Terminal (Visa)", platform: PaymentPlatform.VISA, sortOrder: 3 },
    { name: "Terminal (UzCard)", platform: PaymentPlatform.UZCARD, sortOrder: 4 },
    { name: "Click", platform: PaymentPlatform.CLICK, sortOrder: 5 },
    { name: "Payme", platform: PaymentPlatform.PAYME, sortOrder: 6 },
  ];

  for (const pt of paymentTypes) {
    const existing = await prisma.paymentType.findFirst({
      where: { platform: pt.platform },
    });
    if (!existing) {
      await prisma.paymentType.create({ data: pt });
    }
  }

  const categories = [
    "Konsultatsiya",
    "Stacionar",
    "Laboratoriya",
    "Ovqat",
    "Diagnostika",
    "Dori-darmon",
    "Protsedura",
    "Boshqa",
  ];

  const catMap: Record<string, string> = {};
  for (const name of categories) {
    const cat = await prisma.serviceCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    catMap[name] = cat.id;
  }

  const services = [
    { name: "Konsultatsiya", price: 100_000, category: "Konsultatsiya" },
    { name: "3 kishilik xona", price: 5_500_000, category: "Stacionar" },
    { name: "4 kishilik xona", price: 5_000_000, category: "Stacionar" },
    { name: "2 kishilik xona", price: 6_000_000, category: "Stacionar" },
    {
      name: "Laboratoriya tahlili (belgilangan shablon asosida)",
      price: 0,
      category: "Laboratoriya",
    },
    { name: "Ovqat 3 mahal", price: 0, category: "Ovqat" },
    { name: "UZI diagnostika", price: 0, category: "Diagnostika" },
    { name: "Dori-darmonlar", price: 0, category: "Dori-darmon" },
    { name: "Ozonoterapiya", price: 60_000, category: "Protsedura" },
    { name: "Siydik analizi", price: 30_000, category: "Laboratoriya" },
    { name: "Kapelnitsa quyish", price: 40_000, category: "Protsedura" },
    { name: "Qo'shimcha xizmat", price: 0, category: "Boshqa" },
  ];

  const serviceNames = services.map((s) => s.name);

  await prisma.service.updateMany({
    where: { name: { notIn: serviceNames } },
    data: { isActive: false },
  });

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (existing) {
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          price: s.price,
          categoryId: catMap[s.category],
          isActive: true,
        },
      });
    } else {
      await prisma.service.create({
        data: {
          name: s.name,
          price: s.price,
          categoryId: catMap[s.category],
        },
      });
    }
  }

  const invoicesWithoutPayments = await prisma.invoice.findMany({
    where: { payments: { none: {} } },
    select: {
      id: true,
      cashierId: true,
      paymentTypeId: true,
      amountPaid: true,
      changeAmount: true,
      total: true,
      createdAt: true,
      status: true,
    },
  });

  for (const inv of invoicesWithoutPayments) {
    await prisma.invoicePayment.create({
      data: {
        invoiceId: inv.id,
        cashierId: inv.cashierId,
        paymentTypeId: inv.paymentTypeId,
        amount: inv.amountPaid,
        changeAmount: inv.changeAmount,
        createdAt: inv.createdAt,
      },
    });

    const balanceDue =
      inv.status === "PARTIALLY_PAID"
        ? Math.max(0, Number(inv.total) - Number(inv.amountPaid))
        : 0;

    await prisma.invoice.update({
      where: { id: inv.id },
      data: { balanceDue },
    });
  }

  const cashPaymentType = await prisma.paymentType.findFirst({
    where: { platform: PaymentPlatform.CASH },
  });

  if (cashPaymentType) {
    await prisma.expense.updateMany({
      where: { paymentTypeId: null },
      data: { paymentTypeId: cashPaymentType.id },
    });
  }

  const legacyExpenses = await prisma.expense.findMany({
    where: { payments: { none: {} } },
  });

  for (const expense of legacyExpenses) {
    const amount = Number(expense.amount);
    const paymentTypeId = expense.paymentTypeId ?? cashPaymentType?.id;

    await prisma.expense.update({
      where: { id: expense.id },
      data: {
        amountPaid: amount,
        balanceDue: 0,
        status: "PAID",
        ...(paymentTypeId && !expense.paymentTypeId
          ? { paymentTypeId }
          : {}),
      },
    });

    if (paymentTypeId) {
      await prisma.expensePayment.create({
        data: {
          expenseId: expense.id,
          createdById: expense.createdById,
          paymentTypeId,
          amount,
          createdAt: expense.createdAt,
        },
      });
    }
  }

  console.log("Seed muvaffaqiyatli yakunlandi.");
  console.log("Admin: admin@klinika / admin123");
  console.log("Kassir: kassir1 / kassir123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
