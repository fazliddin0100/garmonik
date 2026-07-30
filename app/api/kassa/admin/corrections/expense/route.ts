import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit } from "@/lib/kassa/auth";
import {
  correctExpenseDetails,
  correctExpensePaymentAmount,
} from "@/lib/kassa/admin-corrections";
import { OTHER_EXPENSE_CATEGORY } from "@/lib/kassa/expenses";
import { z } from "zod";

export const dynamic = "force-dynamic";

const expenseSchema = z
  .object({
    type: z.literal("expense"),
    expenseId: z.string(),
    category: z.string().min(1),
    categoryDetail: z.string().optional().nullable(),
    amount: z.number().positive(),
    amountPaid: z.number().min(0),
    date: z.string().min(1),
    description: z.string().optional().nullable(),
    payeeName: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.category === OTHER_EXPENSE_CATEGORY && !data.categoryDetail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Boshqa xarajat turini kiriting",
        path: ["categoryDetail"],
      });
    }
    if (
      data.amountPaid > 0 &&
      data.amountPaid < data.amount &&
      !data.payeeName?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Qisman to'lov uchun kimga qarz ekanligini kiriting",
        path: ["payeeName"],
      });
    }
  });

const paymentSchema = z.object({
  type: z.literal("payment"),
  paymentId: z.string(),
  amount: z.number().min(0),
});

const patchSchema = z.union([expenseSchema, paymentSchema]);

function jsonSafe<T>(value: T) {
  return JSON.parse(JSON.stringify(value));
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN"]);
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await request.json();
    } catch {
      return NextResponse.json({ error: "So'rov tanasi noto'g'ri" }, { status: 400 });
    }

    const body = patchSchema.parse(bodyRaw);

    if (body.type === "payment") {
      const expense = await correctExpensePaymentAmount(body.paymentId, body.amount);
      await logAudit(
        session.id,
        "ADMIN_CORRECT_EXPENSE_PAYMENT",
        "expense_payment",
        body.paymentId,
        undefined,
        `Yangi summa: ${body.amount}`
      );
      return NextResponse.json(jsonSafe(expense));
    }

    const expense = await correctExpenseDetails(body.expenseId, {
      category: body.category,
      categoryDetail: body.categoryDetail,
      amount: body.amount,
      amountPaid: body.amountPaid,
      date: body.date,
      description: body.description,
      payeeName: body.payeeName,
    });

    await logAudit(
      session.id,
      "ADMIN_CORRECT_EXPENSE",
      "expense",
      body.expenseId,
      undefined,
      JSON.stringify({
        category: body.category,
        amount: body.amount,
        amountPaid: body.amountPaid,
        date: body.date,
      })
    );

    return NextResponse.json(jsonSafe(expense));
  } catch (e) {
    console.error("PATCH /api/admin/corrections/expense failed:", e);

    if (e instanceof z.ZodError) {
      const msg = e.errors[0]?.message || "Noto'g'ri ma'lumot";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const message = e instanceof Error ? e.message : "Saqlashda xatolik";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
