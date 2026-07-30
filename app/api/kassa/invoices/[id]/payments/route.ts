import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireSession } from "@/lib/kassa/auth";
import { applyInvoicePayment } from "@/lib/kassa/invoice-payments";
import { syncInpatientRoomPaymentAfterInvoice } from "@/lib/inpatient/mark-room-payment";
import { z } from "zod";

const schema = z.object({
  paymentTypeId: z.string(),
  amountPaid: z.number().positive(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const data = schema.parse(body);

    const result = await applyInvoicePayment({
      invoiceId: id,
      cashierId: session.id,
      payment: {
        paymentTypeId: data.paymentTypeId,
        amount: data.amountPaid,
      },
      patientName: "Qarz to'lovi",
    });

    await logAudit(
      session.id,
      "INVOICE_PAYMENT",
      "invoice",
      id,
      undefined,
      JSON.stringify({
        amount: data.amountPaid,
        invoiceNumber: result.invoice.invoiceNumber,
      })
    );

    try {
      const garmonikId = result.invoice.patient?.garmonikPatientId;
      await syncInpatientRoomPaymentAfterInvoice(garmonikId, id);
    } catch (syncError) {
      console.error("inpatient room payment sync failed:", syncError);
    }

    return NextResponse.json(result.invoice);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }

    const message = e instanceof Error ? e.message : "To'lov saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
