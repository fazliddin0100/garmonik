import { PrismaClient, PaymentPlatform, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const cashierHash = await bcrypt.hash("kassir123", 12);

  await prisma.clinicSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      name: process.env.NEXT_PUBLIC_CLINIC_NAME || "Gormonik Plus Klinik",
      address: "Toshkent",
      phone: "+998 71 000 00 00",
    },
  });

  await prisma.user.upsert({
    where: { login: "admin@klinika" },
    update: {},
    create: {
      login: "admin@klinika",
      passwordHash: adminHash,
      fullName: "Administrator",
      role: UserRole.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { login: "kassir1" },
    update: {},
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
    "Diagnostika",
    "Laboratoriya",
    "Terapiya",
    "Jarrohlik",
    "Stomatologiya",
  ];

  const catMap = {};
  for (const name of categories) {
    const cat = await prisma.serviceCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    catMap[name] = cat.id;
  }

  const services = [
    { name: "Umumiy qon tahlili", price: 85000, category: "Laboratoriya" },
    { name: "EKG", price: 120000, category: "Diagnostika" },
    { name: "UZI qorin", price: 180000, category: "Diagnostika" },
    { name: "Rentgen o'pkalar", price: 150000, category: "Diagnostika" },
    { name: "Terapevt konsultatsiya", price: 100000, category: "Terapiya" },
    { name: "Stomatolog konsultatsiya", price: 80000, category: "Stomatologiya" },
    { name: "Tish tozalash", price: 200000, category: "Stomatologiya" },
    { name: "IV droppa", price: 75000, category: "Terapiya" },
  ];

  for (const s of services) {
    const exists = await prisma.service.findFirst({ where: { name: s.name } });
    if (!exists) {
      await prisma.service.create({
        data: {
          name: s.name,
          price: s.price,
          categoryId: catMap[s.category],
        },
      });
    }
  }

  console.log("Seed muvaffaqiyatli yakunlandi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
