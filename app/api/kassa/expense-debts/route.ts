import { NextRequest, NextResponse } from "next/server";
import { logAudit, requireSession } from "@/lib/kassa/auth";
import { parseClinicDateString } from "@/lib/kassa/date";
import {
  getExpenseDebtsGrouped,
  getExpenseDebtStats,
} from "@/lib/kassa/expense-debts";
import {
  EXPENSE_CATEGORIES,
  OTHER_EXPENSE_CATEGORY,
} from "@/lib/kassa/expenses";
import { createExpenseDebt } from "@/lib/kassa/expense-payments";
import { z } from "zod";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, debts] = await Promise.all([
    getExpenseDebtStats(),
    getExpenseDebtsGrouped(),
  ]);

  return NextResponse.json({
    stats,
    debts,
    categories: [...EXPENSE_CATEGORIES],
  });
}

const createSchema = z
  .object({
    category: z.string().min(1),
    categoryDetail: z.string().optional(),
    amount: z.number().positive(),
    amountPaid: z.number().min(0).optional(),
    payeeName: z.string().min(1),
    description: z.string().optional(),
    date: z.string().min(1),
    paymentTypeId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === OTHER_EXPENSE_CATEGORY && !data.categoryDetail?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Boshqa xarajat turini kiriting",
        path: ["categoryDetail"],
      });
    }
    const paid = data.amountPaid ?? 0;
    if (paid > data.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "To'langan summa qarz summasidan oshmasligi kerak",
        path: ["amountPaid"],
      });
    }
    if (paid > 0 && !data.paymentTypeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hozir to'lanadigan summa uchun to'lov turini tanlang",
        path: ["paymentTypeId"],
      });
    }
  });

/** Yangi klinika qarzi — to‘lov keyinroq; to‘langan qism Chiqimga yoziladi */
export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const amountPaid = data.amountPaid ?? 0;

    const expense = await createExpenseDebt({
      category: data.category,
      categoryDetail:
        data.category === OTHER_EXPENSE_CATEGORY
          ? data.categoryDetail?.trim()
          : null,
      amount: data.amount,
      amountPaid,
      payeeName: data.payeeName,
      description: data.description,
      date: parseClinicDateString(data.date),
      createdById: session.id,
      paymentTypeId: data.paymentTypeId,
    });

    await logAudit(
      session.id,
      "EXPENSE_DEBT_CREATED",
      "expense",
      expense.id,
      undefined,
      JSON.stringify({
        payeeName: data.payeeName,
        amount: data.amount,
        amountPaid,
        category: data.category,
      }),
    );

    return NextResponse.json(expense, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors[0]?.message || "Ma'lumotlar noto'g'ri";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Saqlashda xatolik";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
