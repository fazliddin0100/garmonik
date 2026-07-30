import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/kassa/auth";
import { getAuditLogs, type AuditLogPeriod } from "@/lib/kassa/audit-logs";

export async function GET(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get("period") || "day") as AuditLogPeriod;

  const data = await getAuditLogs({
    period,
    date: searchParams.get("date") || undefined,
    month: searchParams.get("month") || undefined,
    year: searchParams.get("year") || undefined,
    search: searchParams.get("search") || undefined,
  });

  return NextResponse.json(data);
}
