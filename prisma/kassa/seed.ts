import { config } from "dotenv";
import { PrismaClient, PaymentPlatform, UserRole } from ".prisma/kassa-client";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  "Diagnostika",
  "Laboratoriya",
  "Terapiya",
  "Jarrohlik",
  "Stomatologiya",
];

const DEFAULT_SERVICES = [
  { name: "Umumiy qon tahlili", price: 85000, category: "Laboratoriya" },
  { name: "EKG", price: 120000, category: "Diagnostika" },
  { name: "UZI qorin", price: 180000, category: "Diagnostika" },
  { name: "Rentgen o'pkalar", price: 150000, category: "Diagnostika" },
  { name: "Terapevt konsultatsiya", price: 100000, category: "Terapiya" },
  { name: "Stomatolog konsultatsiya", price: 80000, category: "Stomatologiya" },
  { name: "Tish tozalash", price: 200000, category: "Stomatologiya" },
  { name: "IV droppa", price: 75000, category: "Terapiya" },
];

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);
  const cashierHash = await bcrypt.hash("kassir123", 12);

  await prisma.clinicSettings.upsert({
    where: { id: "default" },
    update: {
      name: process.env.NEXT_PUBLIC_CLINIC_NAME || "",
      address: "",
      phone: "",
    },
    create: {
      id: "default",
      name: process.env.NEXT_PUBLIC_CLINIC_NAME || "",
      address: "",
      phone: "",
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

  const catMap = new Map<string, string>();
  for (const name of DEFAULT_CATEGORIES) {
    const cat = await prisma.serviceCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    catMap.set(name, cat.id);
  }

  for (const s of DEFAULT_SERVICES) {
    const exists = await prisma.service.findFirst({ where: { name: s.name } });
    if (!exists) {
      await prisma.service.create({
        data: {
          name: s.name,
          price: s.price,
          categoryId: catMap.get(s.category),
          isActive: true,
        },
      });
      continue;
    }
    await prisma.service.update({
      where: { id: exists.id },
      data: {
        price: s.price,
        categoryId: catMap.get(s.category) ?? exists.categoryId,
        isActive: true,
      },
    });
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
