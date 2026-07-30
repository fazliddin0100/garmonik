import { prisma } from "./prisma";

export const invoiceReceiptInclude = {
  patient: true,
  paymentType: true,
  cashier: { select: { fullName: true } },
  items: { include: { service: true } },
  payments: {
    orderBy: { createdAt: "asc" as const },
    include: { paymentType: true },
  },
};

export async function getInvoiceForReceipt(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: invoiceReceiptInclude,
  });
}
