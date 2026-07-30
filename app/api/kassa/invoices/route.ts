import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit } from "@/lib/kassa/auth";
import {
  getDayRangeFromDateString,
  getMonthRangeFromString,
  getYearRangeFromString,
} from "@/lib/kassa/date";
import type { Prisma } from ".prisma/kassa-client";
import { getAddonService } from "@/lib/kassa/custom-service";
import {
  chargePaymentGateway,
  computeCashChange,
  computeInvoiceStatus,
  recordInvoicePayment,
} from "@/lib/kassa/invoice-payments";
import { resolveKassaPatientForInvoice } from "@/lib/kassa/patient-bridge";
import { markPatientAfterKassaPayment } from "@/lib/kassa/payment-queue";
import { syncInpatientRoomPaymentAfterInvoice } from "@/lib/inpatient/mark-room-payment";
import { prisma } from "@/lib/kassa/prisma";
import { z } from "zod";

const catalogItemSchema = z.object({
  type: z.literal("catalog"),
  serviceId: z.string(),
  quantity: z.number().int().min(1),
});

const customItemSchema = z.object({
  type: z.literal("custom"),
  customName: z.string().min(2),
  customPrice: z.number().positive(),
  quantity: z.number().int().min(1),
});

const itemSchema = z.discriminatedUnion("type", [catalogItemSchema, customItemSchema]);

const schema = z.object({
  patientName: z.string().min(2),
  patientPhone: z.string().optional(),
  kassaPatientId: z.string().optional(),
  garmonikPatientId: z.string().uuid().optional(),
  referralNote: z.string().optional(),
  paymentTypeId: z.string(),
  discount: z.number().min(0).default(0),
  amountPaid: z.number().min(0),
  isPartialPayment: z.boolean().optional().default(false),
  items: z.array(itemSchema).min(1),
});

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const date = searchParams.get("date");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const search = searchParams.get("search")?.trim();

  const where: Prisma.InvoiceWhereInput = {};

  if (date) {
    const { start, end } = getDayRangeFromDateString(date);
    where.createdAt = { gte: start, lte: end };
  } else if (month) {
    const { start, end } = getMonthRangeFromString(month);
    where.createdAt = { gte: start, lte: end };
  } else if (year) {
    const { start, end } = getYearRangeFromString(year);
    where.createdAt = { gte: start, lte: end };
  }

  if (search) {
    where.patient = {
      fullName: { contains: search, mode: "insensitive" },
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      patient: true,
      paymentType: true,
      cashier: { select: { fullName: true } },
      items: { include: { service: true } },
      payments: {
        orderBy: { createdAt: "asc" },
        include: { paymentType: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(invoices);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = schema.parse(body);

    const catalogIds = data.items
      .filter((i): i is z.infer<typeof catalogItemSchema> => i.type === "catalog")
      .map((i) => i.serviceId);

    const services =
      catalogIds.length > 0
        ? await prisma.service.findMany({
            where: { id: { in: catalogIds }, isActive: true },
          })
        : [];

    if (services.length !== catalogIds.length) {
      return NextResponse.json({ error: "Xizmat topilmadi" }, { status: 400 });
    }

    const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));
    const addonService = data.items.some((i) => i.type === "custom")
      ? await getAddonService()
      : null;

    let subtotal = 0;
    const lineItems: Array<{
      serviceId: string;
      customLabel?: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }> = [];

    for (const item of data.items) {
      if (item.type === "custom") {
        if (!addonService) {
          return NextResponse.json({ error: "Qo'shimcha xizmat saqlanmadi" }, { status: 400 });
        }
        const unitPrice = item.customPrice;
        const lineSubtotal = unitPrice * item.quantity;
        subtotal += lineSubtotal;
        lineItems.push({
          serviceId: addonService.id,
          customLabel: item.customName.trim(),
          quantity: item.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        });
        continue;
      }

      const service = serviceMap[item.serviceId];
      const unitPrice = parseFloat(service.price.toString());
      const lineSubtotal = unitPrice * item.quantity;
      subtotal += lineSubtotal;
      lineItems.push({
        serviceId: item.serviceId,
        quantity: item.quantity,
        unitPrice,
        subtotal: lineSubtotal,
      });
    }

    const discount = data.discount;
    const total = Math.max(0, subtotal - discount);

    const paymentType = await prisma.paymentType.findUnique({
      where: { id: data.paymentTypeId },
    });

    if (!paymentType) {
      return NextResponse.json({ error: "To'lov turi topilmadi" }, { status: 400 });
    }

    const isCash = paymentType.platform === "CASH";
    const isPartial = data.isPartialPayment;
    const paymentAmount = isPartial
      ? data.amountPaid
      : isCash
        ? data.amountPaid || total
        : total;

    if (total <= 0) {
      return NextResponse.json({ error: "Jami summa 0 bo'lishi mumkin emas" }, { status: 400 });
    }

    if (isPartial) {
      if (paymentAmount < 0 || paymentAmount >= total) {
        return NextResponse.json(
          {
            error:
              "Qisman to'lov summasi 0 bo'lishi mumkin, lekin jami summadan kichik bo'lishi kerak",
          },
          { status: 400 }
        );
      }
    } else if (isCash && paymentAmount < total) {
      return NextResponse.json(
        {
          error:
            "Naqt pul yetarli emas. Qisman to'lov uchun «Qisman to'lov» rejimini yoqing.",
        },
        { status: 400 }
      );
    }

    const changeAmount = computeCashChange(paymentType, paymentAmount, total, !isPartial);
    const appliedAmount = isPartial ? paymentAmount : Math.min(paymentAmount, total);
    const balanceDue = Math.max(0, total - appliedAmount);
    const status = computeInvoiceStatus(total, appliedAmount);

    if (appliedAmount > 0) {
      await chargePaymentGateway({
        paymentType,
        amount: appliedAmount,
        reference: `INV-${Date.now()}-${session.id.slice(-6)}`,
        description: data.patientName,
      });
    }

    const patient = await resolveKassaPatientForInvoice({
      kassaPatientId: data.kassaPatientId,
      garmonikPatientId: data.garmonikPatientId,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
    });

    const invoice = await prisma.invoice.create({
      data: {
        patientId: patient.id,
        cashierId: session.id,
        paymentTypeId: data.paymentTypeId,
        subtotal,
        discount,
        total,
        amountPaid: appliedAmount,
        balanceDue,
        changeAmount,
        referralNote: data.referralNote,
        status,
        items: { create: lineItems },
      },
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

    if (appliedAmount > 0) {
      await recordInvoicePayment({
        invoiceId: invoice.id,
        cashierId: session.id,
        paymentType,
        amount: appliedAmount,
        changeAmount,
      });
    }

    const invoiceWithPayments = await prisma.invoice.findUnique({
      where: { id: invoice.id },
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

    await logAudit(
      session.id,
      "INVOICE_CREATED",
      "invoice",
      invoice.id,
      undefined,
      JSON.stringify({
        patientName: data.patientName,
        amountPaid: appliedAmount,
        invoiceNumber: invoice.invoiceNumber,
        isPartial,
      })
    );

    if (data.garmonikPatientId) {
      try {
        await syncInpatientRoomPaymentAfterInvoice(data.garmonikPatientId, invoice.id);
        await markPatientAfterKassaPayment(data.garmonikPatientId);
      } catch (queueError) {
        console.error("queue status update failed:", queueError);
      }
    } else if (patient.garmonikPatientId) {
      try {
        await syncInpatientRoomPaymentAfterInvoice(patient.garmonikPatientId, invoice.id);
        await markPatientAfterKassaPayment(patient.garmonikPatientId);
      } catch (queueError) {
        console.error("queue status update failed:", queueError);
      }
    }

    return NextResponse.json(invoiceWithPayments, { status: 201 });
  } catch (e) {
    console.error("Invoice POST error:", e);

    if (e instanceof z.ZodError) {
      const first = e.errors[0];
      const field = first?.path.join(".") || "";
      return NextResponse.json(
        { error: field ? `${field}: noto'g'ri ma'lumot` : "Ma'lumotlar noto'g'ri kiritilgan" },
        { status: 400 }
      );
    }

    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    if (e && typeof e === "object" && "code" in e) {
      const prismaError = e as { code?: string; message?: string };
      if (prismaError.message?.includes("customLabel")) {
        return NextResponse.json(
          {
            error:
              "Server yangilanishi kerak. Dev serverni to'xtatib, npx prisma generate va npm run dev qiling.",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "To'lov saqlanmadi" }, { status: 400 });
  }
}
