import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit } from "@/lib/kassa/auth";
import { listRefundableInvoices, refundInvoiceAmount } from "@/lib/kassa/admin-corrections";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const invoices = await listRefundableInvoices({
    date: searchParams.get("date") || undefined,
    month: searchParams.get("month") || undefined,
    search: searchParams.get("search") || undefined,
  });

  return NextResponse.json({ invoices });
}

const schema = z.object({
  invoiceId: z.string(),
  refundAmount: z.number().positive(),
  paymentId: z.string().optional(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());
    const invoice = await refundInvoiceAmount({
      ...body,
      adminId: session.id,
    });

    await logAudit(
      session.id,
      "ADMIN_REFUND_INVOICE",
      "invoice",
      body.invoiceId,
      undefined,
      JSON.stringify({
        refundAmount: body.refundAmount,
        paymentId: body.paymentId,
        note: body.note,
      })
    );

    return NextResponse.json(invoice);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Qaytarishda xatolik";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
