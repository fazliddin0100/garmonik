import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit } from "@/lib/kassa/auth";
import { cancelInvoiceDebt } from "@/lib/kassa/admin-corrections";
import { z } from "zod";

const schema = z.object({
  invoiceId: z.string(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());
    const invoice = await cancelInvoiceDebt(body.invoiceId, body.note);

    await logAudit(
      session.id,
      "ADMIN_CANCEL_DEBT",
      "invoice",
      body.invoiceId,
      undefined,
      body.note?.trim() || "Qarz bekor qilindi"
    );

    return NextResponse.json(invoice);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Bekor qilishda xatolik";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
