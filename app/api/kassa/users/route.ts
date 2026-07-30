import { NextRequest, NextResponse } from "next/server";
import { requireSession, logAudit, hashPassword } from "@/lib/kassa/auth";
import { prisma } from "@/lib/kassa/prisma";
import { UserRole } from ".prisma/kassa-client";
import { z } from "zod";

const loginSchema = z.string().email().or(z.string().min(3));

const createSchema = z.object({
  login: loginSchema,
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(["ADMIN", "CASHIER"]),
});

const updateSchema = z
  .object({
    userId: z.string().min(1),
    fullName: z.string().min(2).optional(),
    login: loginSchema.optional(),
    newPassword: z.string().min(6).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.fullName !== undefined ||
      data.login !== undefined ||
      data.newPassword !== undefined ||
      data.isActive !== undefined,
    { message: "O'zgartirish uchun kamida bitta maydon kerak" }
  );

const deleteSchema = z.object({
  userId: z.string().min(1),
});

async function countActiveAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: UserRole.ADMIN,
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

export async function GET() {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      login: true,
      fullName: true,
      role: true,
      isActive: true,
      lockedUntil: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = createSchema.parse(await request.json());
    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        login: data.login.trim(),
        passwordHash,
        fullName: data.fullName.trim(),
        role: data.role as UserRole,
      },
      select: {
        id: true,
        login: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    await logAudit(session.id, "USER_CREATED", "user", user.id);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Bu login allaqachon band" }, { status: 409 });
    }
    console.error("User POST error:", error);
    return NextResponse.json({ error: "Foydalanuvchi qo'shib bo'lmadi" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = updateSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    if (data.isActive === false) {
      if (existing.id === session.id) {
        return NextResponse.json({ error: "O'zingizni nofaol qilib bo'lmaysiz" }, { status: 400 });
      }

      if (existing.role === UserRole.ADMIN && existing.isActive) {
        const otherActiveAdmins = await countActiveAdmins(existing.id);
        if (otherActiveAdmins === 0) {
          return NextResponse.json(
            { error: "Oxirgi faol adminni o'chirib bo'lmaysiz" },
            { status: 400 }
          );
        }
      }
    }

    const updateData: {
      fullName?: string;
      login?: string;
      passwordHash?: string;
      failedLoginCount?: number;
      lockedUntil?: null;
      isActive?: boolean;
    } = {};

    if (data.fullName !== undefined) {
      updateData.fullName = data.fullName.trim();
    }

    if (data.login !== undefined) {
      updateData.login = data.login.trim();
    }

    if (data.newPassword) {
      updateData.passwordHash = await hashPassword(data.newPassword);
      updateData.failedLoginCount = 0;
      updateData.lockedUntil = null;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const user = await prisma.user.update({
      where: { id: data.userId },
      data: updateData,
      select: {
        id: true,
        login: true,
        fullName: true,
        role: true,
        isActive: true,
        lockedUntil: true,
      },
    });

    await logAudit(
      session.id,
      data.newPassword ? "PASSWORD_RESET" : "USER_UPDATED",
      "user",
      data.userId
    );

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Bu login allaqachon band" }, { status: 409 });
    }
    console.error("User PATCH error:", error);
    return NextResponse.json({ error: "Saqlashda xatolik" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireSession(["ADMIN"]);
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = deleteSchema.parse(await request.json());

    if (data.userId === session.id) {
      return NextResponse.json({ error: "O'zingizni o'chirib bo'lmaysiz" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
    }

    if (existing.role === UserRole.ADMIN && existing.isActive) {
      const otherActiveAdmins = await countActiveAdmins(existing.id);
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { error: "Oxirgi faol adminni o'chirib bo'lmaysiz" },
          { status: 400 }
        );
      }
    }

    const [invoices, invoicePayments, expenses, expensePayments] = await Promise.all([
      prisma.invoice.count({ where: { cashierId: existing.id } }),
      prisma.invoicePayment.count({ where: { cashierId: existing.id } }),
      prisma.expense.count({ where: { createdById: existing.id } }),
      prisma.expensePayment.count({ where: { createdById: existing.id } }),
    ]);

    const hasHistory = invoices + invoicePayments + expenses + expensePayments > 0;

    if (hasHistory) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
      await logAudit(session.id, "USER_DEACTIVATED", "user", existing.id);
      return NextResponse.json({
        deactivated: true,
        message:
          "Foydalanuvchi tarixga ega — ro'yxatdan o'chirildi (nofaol holatga o'tkazildi)",
      });
    }

    await prisma.user.delete({ where: { id: existing.id } });
    await logAudit(session.id, "USER_DELETED", "user", existing.id);
    return NextResponse.json({
      deleted: true,
      message: "Foydalanuvchi butunlay o'chirildi",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
    }
    console.error("User DELETE error:", error);
    return NextResponse.json({ error: "O'chirib bo'lmadi" }, { status: 500 });
  }
}
