import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/kassa/auth";
import { getDebtorsGrouped, getDebtStats, getPatientDebtDetail } from "@/lib/kassa/debts";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  if (patientId) {
    const detail = await getPatientDebtDetail(patientId);
    if (!detail) {
      return NextResponse.json({ error: "Bemor topilmadi" }, { status: 404 });
    }
    return NextResponse.json(detail);
  }

  const [stats, debtors] = await Promise.all([getDebtStats(), getDebtorsGrouped()]);

  return NextResponse.json({ stats, debtors });
}
