import { NextResponse } from "next/server";
import { requireSession } from "@/lib/kassa/auth";
import { getExpenseDebtsGrouped, getExpenseDebtStats } from "@/lib/kassa/expense-debts";

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, debts] = await Promise.all([
    getExpenseDebtStats(),
    getExpenseDebtsGrouped(),
  ]);

  return NextResponse.json({ stats, debts });
}
