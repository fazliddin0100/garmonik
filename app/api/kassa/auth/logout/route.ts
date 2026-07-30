import { NextResponse } from "next/server";
import { destroySession, getSession, logAudit } from "@/lib/kassa/auth";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logAudit(session.id, "LOGOUT", "user", session.id);
  }
  await destroySession();
  return NextResponse.json({ ok: true });
}
