import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit } from "@/lib/kassa/auth";
import {
  getMonthDateBounds,
  getYearDateBounds,
  normalizeDateRange,
  parseClinicDateString,
} from "@/lib/kassa/date";
import { EXPENSE_CATEGORIES, OTHER_EXPENSE_CATEGORY } from "@/lib/kassa/expenses";
import { createExpenseWithPayment } from "@/lib/kassa/expense-payments";
import { getExpenseDebtStats } from "@/lib/kassa/expense-debts";
import type { Prisma } from ".prisma/kassa-client";
import { prisma } from "@/lib/kassa/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const expenseInclude = {
  createdBy: { select: { fullName: true } },
  paymentType: { select: { id: true, name: true, platform: true } },
  payments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      paymentType: { select: { id: true, name: true, platform: true } },
      createdBy: { select: { fullName: true } },
    },
  },
};

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date")?.trim();
  const from = searchParams.get("from")?.trim();
  const to = searchParams.get("to")?.trim();
  const month = searchParams.get("month")?.trim();
  const year = searchParams.get("year")?.trim();

  const where: Prisma.ExpenseWhereInput = {};
  if (from && to) {
    const [fromNorm, toNorm] = normalizeDateRange(from, to);
    where.date = {
      gte: parseClinicDateString(fromNorm),
      lte: parseClinicDateString(toNorm),
    };
  } else if (date) {
    where.date = parseClinicDateString(date);
  } else if (month) {
    const { from, to } = getMonthDateBounds(month);
    where.date = {
      gte: parseClinicDateString(from),
      lte: parseClinicDateString(to),
    };
  } else if (year) {
    const { from, to } = getYearDateBounds(year);
    where.date = {
      gte: parseClinicDateString(from),
      lte: parseClinicDateString(to),
    };
  }

  try {
    const [expenses, debtStats] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      getExpenseDebtStats(),
    ]);

    return NextResponse.json({
      expenses,
      categories: [...EXPENSE_CATEGORIES],
      debtStats,
    });
  } catch (e) {
    console.error("GET /api/expenses failed:", e);
    return NextResponse.json(
      {
        expenses: [],
        categories: [...EXPENSE_CATEGORIES],
        debtStats: null,
        error: "Xarajatlar yuklanmadi. Bazani yangilang: npx prisma db push",
      },
      { status: 500 }
    );
  }
}

const schema = z
  .object({
    category: z.string().min(1),
    categoryDetail: z.string().optional(),
    amount: z.number().positive(),
    amountPaid: z.number().positive().optional(),
    payeeName: z.string().optional(),
    description: z.string().optional(),
    date: z.string(),
    paymentTypeId: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.category === OTHER_EXPENSE_CATEGORY) {
      if (!data.categoryDetail?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Boshqa xarajat turini kiriting",
          path: ["categoryDetail"],
        });
      }
    }
    const paid = data.amountPaid ?? data.amount;
    if (paid > data.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "To'langan summa jami xarajatdan oshmasligi kerak",
        path: ["amountPaid"],
      });
    }
    if (paid < data.amount && !data.payeeName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Qisman to'lov uchun kimga qarz ekanligini kiriting",
        path: ["payeeName"],
      });
    }
  });

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = schema.parse(await request.json());
    const amountPaid = data.amountPaid ?? data.amount;

    const expense = await createExpenseWithPayment({
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
      paymentTypeId: data.paymentTypeId,
      createdById: session.id,
    });

    await logAudit(session.id, "EXPENSE_CREATED", "expense", expense.id, undefined, JSON.stringify({
      payeeName: data.payeeName,
      amountPaid,
      amount: data.amount,
      category: data.category,
    }));
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
