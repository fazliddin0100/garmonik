import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit, type SessionUser } from "@/lib/kassa/auth";
import { ensureKassaServicesAvailable } from "@/lib/kassa/ensure-services";
import { prisma } from "@/lib/kassa/prisma";
import { z } from "zod";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureKassaServicesAvailable();

  const services = await prisma.service.findMany({
    where: { isActive: true },
    include: { category: true },
    orderBy: [{ name: "asc" }],
  });

  return NextResponse.json(
    services.map((s) => ({
      ...s,
      price: Number(s.price),
    })),
  );
}

const createSchema = z.object({
  name: z.string().min(2),
  price: z.coerce.number().min(0),
  categoryId: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  price: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

function zodErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
  console.error("kassa/services:", error);
  return NextResponse.json({ error: "Saqlashda xatolik" }, { status: 500 });
}

async function updateService(session: SessionUser, raw: unknown) {
  const data = updateSchema.parse(raw);
  const existing = await prisma.service.findUnique({ where: { id: data.id } });
  if (!existing) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  if (
    data.price !== undefined &&
    data.price !== parseFloat(existing.price.toString())
  ) {
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
  return NextResponse.json({
    ...service,
    price: Number(service.price),
  });
}

export async function POST(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (id) {
      return await updateService(session, { ...body, id });
    }

    const data = createSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        name: data.name,
        price: data.price,
        categoryId: data.categoryId,
      },
    });

    await logAudit(session.id, "SERVICE_CREATED", "service", service.id);
    return NextResponse.json(
      { ...service, price: Number(service.price) },
      { status: 201 },
    );
  } catch (error) {
    return zodErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return await updateService(session, await request.json());
  } catch (error) {
    return zodErrorResponse(error);
  }
}
