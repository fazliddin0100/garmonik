import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit } from "@/lib/kassa/auth";
import {
  correctInvoiceAmounts,
  correctInvoicePaymentAmount,
  listIncomeCorrections,
} from "@/lib/kassa/admin-corrections";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const data = await listIncomeCorrections({
    date: searchParams.get("date") || undefined,
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    month: searchParams.get("month") || undefined,
    search: searchParams.get("search") || undefined,
  });

  return NextResponse.json(data);
}

const paymentSchema = z.object({
  type: z.literal("payment"),
  paymentId: z.string(),
  amount: z.number().min(0),
});

const invoiceSchema = z.object({
  type: z.literal("invoice"),
  invoiceId: z.string(),
  total: z.number().positive().optional(),
  discount: z.number().min(0).optional(),
  amountPaid: z.number().min(0).optional(),
});

const patchSchema = z.discriminatedUnion("type", [paymentSchema, invoiceSchema]);

export async function PATCH(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await request.json());

    if (body.type === "payment") {
      const invoice = await correctInvoicePaymentAmount(body.paymentId, body.amount);
      await logAudit(
        session.id,
        "ADMIN_CORRECT_INCOME_PAYMENT",
        "invoice_payment",
        body.paymentId,
        undefined,
        `Yangi summa: ${body.amount}`
      );
      return NextResponse.json(invoice);
    }

    const invoice = await correctInvoiceAmounts(body.invoiceId, {
      total: body.total,
      discount: body.discount,
      amountPaid: body.amountPaid,
    });
    await logAudit(
      session.id,
      "ADMIN_CORRECT_INVOICE",
      "invoice",
      body.invoiceId,
      undefined,
      JSON.stringify({
        total: body.total,
        discount: body.discount,
        amountPaid: body.amountPaid,
      })
    );
    return NextResponse.json(invoice);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Saqlashda xatolik";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
