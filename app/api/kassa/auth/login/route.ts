import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/kassa/auth";
import { z } from "zod";

const schema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password } = schema.parse(body);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ??
      request.headers.get("x-real-ip") ??
      undefined;

    const result = await loginUser(login, password, ip);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      role: result.user.role,
      fullName: result.user.fullName,
    });
  } catch {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
}
