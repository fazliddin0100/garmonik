import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PaymentPlatform } from ".prisma/kassa-client";
import { requireSession } from "@/lib/kassa/auth";
import { prisma } from "@/lib/kassa/prisma";
import { checkGatewayHealth, isGatewayConfigured } from "@/lib/kassa/payment-gateway";

function serializeForCashier(type: {
  id: string;
  name: string;
  platform: PaymentPlatform;
  sortOrder: number;
  gatewayHost: string | null;
}) {
  return {
    id: type.id,
    name: type.name,
    platform: type.platform,
    sortOrder: type.sortOrder,
    requiresGateway: type.platform !== "CASH",
    gatewayConfigured: isGatewayConfigured(type),
  };
}

function serializeForAdmin(type: {
  id: string;
  name: string;
  platform: PaymentPlatform;
  isActive: boolean;
  sortOrder: number;
  gatewayHost: string | null;
  gatewayPort: number;
  gatewayPath: string;
}) {
  return {
    ...serializeForCashier(type),
    isActive: type.isActive,
    gatewayHost: type.gatewayHost || "",
    gatewayPort: type.gatewayPort,
    gatewayPath: type.gatewayPath,
  };
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const types = await prisma.paymentType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  if (session.role === "ADMIN") {
    return NextResponse.json(types.map(serializeForAdmin));
  }

  return NextResponse.json(types.map(serializeForCashier));
}

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(2).optional(),
  gatewayHost: z.string().optional(),
  gatewayPort: z.number().int().min(1).max(65535).optional(),
  gatewayPath: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

const createSchema = z.object({
  name: z.string().min(2),
  gatewayHost: z.string().min(3),
  gatewayPort: z.number().int().min(1).max(65535).default(8080),
  gatewayPath: z.string().min(1).default("/api/kassa/payment"),
});

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = updateSchema.parse(await request.json());
    const { id, ...data } = body;

    const existing = await prisma.paymentType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "To'lov turi topilmadi" }, { status: 404 });
    }

    if (existing.platform === "CASH" && data.gatewayHost !== undefined) {
      return NextResponse.json({ error: "Naqt pul uchun IP sozlash shart emas" }, { status: 400 });
    }

    const updated = await prisma.paymentType.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.gatewayHost !== undefined && {
          gatewayHost: data.gatewayHost.trim() || null,
        }),
        ...(data.gatewayPort !== undefined && { gatewayPort: data.gatewayPort }),
        ...(data.gatewayPath !== undefined && { gatewayPath: data.gatewayPath }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json(serializeForAdmin(updated));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Saqlashda xatolik" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = createSchema.parse(await request.json());

    const maxOrder = await prisma.paymentType.aggregate({ _max: { sortOrder: true } });

    const created = await prisma.paymentType.create({
      data: {
        name: body.name.trim(),
        platform: PaymentPlatform.CUSTOM,
        gatewayHost: body.gatewayHost.trim(),
        gatewayPort: body.gatewayPort,
        gatewayPath: body.gatewayPath,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(serializeForAdmin(created), { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Qo'shishda xatolik" }, { status: 400 });
  }
}

const testSchema = z.object({
  id: z.string(),
  gatewayHost: z.string().optional(),
  gatewayPort: z.number().int().min(1).max(65535).optional(),
});

export async function PUT(request: NextRequest) {
  const session = await requireSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = testSchema.parse(await request.json());
    const type = await prisma.paymentType.findUnique({ where: { id: body.id } });

    if (!type) {
      return NextResponse.json({ error: "To'lov turi topilmadi" }, { status: 404 });
    }

    const host = body.gatewayHost?.trim() || type.gatewayHost;
    const port = body.gatewayPort ?? type.gatewayPort;

    if (!host) {
      return NextResponse.json({ error: "IP manzil kiritilmagan" }, { status: 400 });
    }

    const result = await checkGatewayHealth(host, port);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Tekshirishda xatolik" }, { status: 400 });
  }
}
