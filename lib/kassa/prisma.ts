import { PrismaClient } from ".prisma/kassa-client";

const globalForPrisma = globalThis as unknown as {
  kassaPrisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.kassaPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.kassaPrisma = prisma;
