import { config } from "dotenv";
import { PrismaClient, PaymentPlatform, UserRole } from ".prisma/kassa-client";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 12);

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

  console.log("Seed muvaffaqiyatli yakunlandi (demo xizmatlar/kassir yo‘q).");
  console.log("Admin: admin@klinika / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
