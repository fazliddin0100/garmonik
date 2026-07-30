import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit } from "@/lib/kassa/auth";
import { prisma } from "@/lib/kassa/prisma";
import { z } from "zod";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json(services);
}

const createSchema = z.object({
  name: z.string().min(2),
  price: z.number().min(0),
  categoryId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const data = createSchema.parse(body);

  const service = await prisma.service.create({
    data: {
      name: data.name,
      price: data.price,
      categoryId: data.categoryId,
    },
  });

  await logAudit(session.id, "SERVICE_CREATED", "service", service.id);
  return NextResponse.json(service, { status: 201 });
}

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = updateSchema.parse(await request.json());
  const existing = await prisma.service.findUnique({ where: { id: data.id } });
  if (!existing) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  if (data.price !== undefined && data.price !== parseFloat(existing.price.toString())) {
    await prisma.servicePriceHistory.create({
      data: {
        serviceId: data.id,
        oldPrice: existing.price,
        newPrice: data.price,
        changedBy: session.id,
      },
    });
  }

  const service = await prisma.service.update({
    where: { id: data.id },
    data: {
      name: data.name,
      price: data.price,
      isActive: data.isActive,
    },
  });

  await logAudit(session.id, "SERVICE_UPDATED", "service", service.id);
  return NextResponse.json(service);
}
