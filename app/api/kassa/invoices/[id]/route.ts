import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/kassa/auth";
import { prisma } from "@/lib/kassa/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: true,
      paymentType: true,
      cashier: { select: { fullName: true } },
      items: { include: { service: true } },
      payments: {
        orderBy: { createdAt: "asc" },
        include: {
          paymentType: true,
          cashier: { select: { fullName: true } },
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}
