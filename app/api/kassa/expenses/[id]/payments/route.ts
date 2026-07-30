import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireSession } from "@/lib/kassa/auth";
import { applyExpensePayment } from "@/lib/kassa/expense-payments";
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

    const result = await applyExpensePayment({
      expenseId: id,
      createdById: session.id,
      payment: {
        paymentTypeId: data.paymentTypeId,
        amount: data.amountPaid,
      },
    });

    await logAudit(
      session.id,
      "EXPENSE_PAYMENT",
      "expense",
      id,
      undefined,
      JSON.stringify({
        amount: data.amountPaid,
        payeeName: result.expense.payeeName,
        category: result.expense.category,
      })
    );

    return NextResponse.json(result.expense);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }

    const message = e instanceof Error ? e.message : "To'lov saqlanmadi";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
