import type { Prisma } from ".prisma/kassa-client";
import {
  getDayRangeFromDateString,
  getMonthRangeFromString,
  getYearRangeFromString,
  CLINIC_TIMEZONE,
} from "./date";
import { getExpenseCategoryLabel } from "./expenses";
import { prisma } from "./prisma";
import { formatMoney, toNumber } from "./utils";

export type AuditLogPeriod = "day" | "month" | "year" | "all";

export type AuditLogItem = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string;
  actorRole: string | null;
  message: string;
  details: string | null;
};

function formatLogDate(date: Date) {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: CLINIC_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function actorLabel(user: { fullName: string; role: string } | null) {
  if (!user) return "Noma'lum foydalanuvchi";
  const roleLabel = user.role === "ADMIN" ? "administrator" : "kassir";
  return `${roleLabel} ${user.fullName}`;
}

function parseDetails(details?: string | null) {
  if (!details) return null;
  try {
    return JSON.parse(details) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function expenseSubject(expense: {
  payeeName?: string | null;
  category: string;
  categoryDetail?: string | null;
}) {
  return expense.payeeName?.trim() || getExpenseCategoryLabel(expense);
}

function buildMessage(
  log: {
    action: string;
    createdAt: Date;
    details: string | null;
    entity: string | null;
    entityId: string | null;
    user: { fullName: string; role: string } | null;
  },
  invoiceMap: Map<
    string,
    {
      invoiceNumber: number;
      total: { toString(): string };
      amountPaid: { toString(): string };
      patient: { fullName: string };
    }
  >,
  expenseMap: Map<
    string,
    {
      amount: { toString(): string };
      amountPaid: { toString(): string };
      payeeName?: string | null;
      category: string;
      categoryDetail?: string | null;
    }
  >
) {
  const dateLabel = formatLogDate(log.createdAt);
  const actor = actorLabel(log.user);
  const parsed = parseDetails(log.details);
  const invoice = log.entityId ? invoiceMap.get(log.entityId) : undefined;
  const expense = log.entityId ? expenseMap.get(log.entityId) : undefined;

  switch (log.action) {
    case "INVOICE_CREATED": {
      if (invoice) {
        return `${dateLabel} da ${actor} ${invoice.patient.fullName} nomiga ${formatMoney(invoice.amountPaid)} to'lov qabul qildi (chek #${invoice.invoiceNumber}).`;
      }
      if (parsed?.patientName && parsed?.amountPaid != null) {
        return `${dateLabel} da ${actor} ${String(parsed.patientName)} nomiga ${formatMoney(Number(parsed.amountPaid))} to'lov qabul qildi.`;
      }
      return `${dateLabel} da ${actor} yangi chek yaratdi. ${log.details || ""}`.trim();
    }
    case "INVOICE_PAYMENT": {
      const amount =
        typeof parsed?.amount === "number"
          ? parsed.amount
          : Number(log.details?.match(/—\s*([\d.]+)/)?.[1] ?? 0);
      if (invoice) {
        return `${dateLabel} da ${actor} ${invoice.patient.fullName} nomiga ${formatMoney(amount)} qarz to'lovi qabul qildi (chek #${invoice.invoiceNumber}).`;
      }
      return `${dateLabel} da ${actor} qarz to'lovini qabul qildi: ${formatMoney(amount)}.`;
    }
    case "EXPENSE_CREATED": {
      if (expense) {
        return `${dateLabel} da ${actor} ${expenseSubject(expense)} uchun ${formatMoney(expense.amountPaid)} xarajat berdi.`;
      }
      if (parsed?.payeeName && parsed?.amountPaid != null) {
        return `${dateLabel} da ${actor} ${String(parsed.payeeName)} uchun ${formatMoney(Number(parsed.amountPaid))} xarajat berdi.`;
      }
      return `${dateLabel} da ${actor} xarajat kiritdi. ${log.details || ""}`.trim();
    }
    case "EXPENSE_PAYMENT": {
      const amount =
        typeof parsed?.amount === "number"
          ? parsed.amount
          : Number(log.details?.match(/—\s*([\d.]+)/)?.[1] ?? 0);
      const payee =
        (typeof parsed?.payeeName === "string" && parsed.payeeName) ||
        (expense ? expenseSubject(expense) : "xarajat");
      return `${dateLabel} da ${actor} ${payee} uchun ${formatMoney(amount)} xarajat to'lovi berdi.`;
    }
    case "ADMIN_REFUND_INVOICE": {
      const refundAmount =
        typeof parsed?.refundAmount === "number" ? parsed.refundAmount : null;
      const patient = invoice?.patient.fullName || "bemor";
      return `${dateLabel} da ${actor} ${patient} ga ${formatMoney(refundAmount ?? 0)} pul qaytardi.`;
    }
    case "ADMIN_CANCEL_DEBT": {
      const patient = invoice?.patient.fullName || "bemor";
      return `${dateLabel} da ${actor} ${patient} ning qarzini bekor qildi. ${log.details || ""}`.trim();
    }
    case "ADMIN_CORRECT_INCOME_PAYMENT":
      return `${dateLabel} da ${actor} kirim to'lov summasini tuzatdi. ${log.details || ""}`.trim();
    case "ADMIN_CORRECT_INVOICE":
      return `${dateLabel} da ${actor} chek summasini tuzatdi. ${log.details || ""}`.trim();
    case "ADMIN_CORRECT_EXPENSE":
      return `${dateLabel} da ${actor} xarajat summasini tuzatdi. ${log.details || ""}`.trim();
    case "ADMIN_CORRECT_EXPENSE_PAYMENT":
      return `${dateLabel} da ${actor} xarajat to'lov summasini tuzatdi. ${log.details || ""}`.trim();
    case "LOGIN_SUCCESS":
      return `${dateLabel} da ${actor} tizimga kirdi.`;
    case "LOGOUT":
      return `${dateLabel} da ${actor} tizimdan chiqdi.`;
    case "LOGIN_FAILED":
      return `${dateLabel} da noto'g'ri kirish urinishi: ${log.details || log.entityId || "noma'lum login"}.`;
    case "USER_CREATED":
      return `${dateLabel} da ${actor} yangi foydalanuvchi yaratdi.`;
    case "USER_UPDATED":
      return `${dateLabel} da ${actor} foydalanuvchini yangiladi.`;
    case "PASSWORD_RESET":
      return `${dateLabel} da ${actor} foydalanuvchi parolini yangiladi.`;
    case "USER_DEACTIVATED":
      return `${dateLabel} da ${actor} foydalanuvchini o'chirdi (faolsiz).`;
    case "USER_DELETED":
      return `${dateLabel} da ${actor} foydalanuvchini o'chirdi.`;
    case "SERVICE_CREATED":
      return `${dateLabel} da ${actor} yangi xizmat qo'shdi.`;
    case "SERVICE_UPDATED":
      return `${dateLabel} da ${actor} xizmatni yangiladi.`;
    default:
      return `${dateLabel} da ${actor}: ${log.action}${log.details ? ` — ${log.details}` : ""}`;
  }
}

export async function getAuditLogs(params: {
  period: AuditLogPeriod;
  date?: string;
  month?: string;
  year?: string;
  search?: string;
}) {
  const where: Prisma.AuditLogWhereInput = {};

  if (params.period === "day" && params.date) {
    const { start, end } = getDayRangeFromDateString(params.date);
    where.createdAt = { gte: start, lte: end };
  } else if (params.period === "month" && params.month) {
    const { start, end } = getMonthRangeFromString(params.month);
    where.createdAt = { gte: start, lte: end };
  } else if (params.period === "year" && params.year) {
    const { start, end } = getYearRangeFromString(params.year);
    where.createdAt = { gte: start, lte: end };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { fullName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const invoiceIds = new Set<string>();
  const expenseIds = new Set<string>();

  for (const log of logs) {
    if (log.entity === "invoice" && log.entityId) invoiceIds.add(log.entityId);
    if (log.entity === "expense" && log.entityId) expenseIds.add(log.entityId);
    if (log.entity === "invoice_payment" && log.entityId) {
      // payment id - skip unless we add lookup later
    }
  }

  const [invoices, expenses] = await Promise.all([
    invoiceIds.size
      ? prisma.invoice.findMany({
          where: { id: { in: Array.from(invoiceIds) } },
          include: { patient: { select: { fullName: true } } },
        })
      : Promise.resolve([]),
    expenseIds.size
      ? prisma.expense.findMany({
          where: { id: { in: Array.from(expenseIds) } },
        })
      : Promise.resolve([]),
  ]);

  const invoiceMap = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const expenseMap = new Map(expenses.map((expense) => [expense.id, expense]));

  const items: AuditLogItem[] = logs.map((log) => ({
    id: log.id,
    action: log.action,
    createdAt: log.createdAt.toISOString(),
    actorName: log.user?.fullName || "Noma'lum",
    actorRole: log.user?.role || null,
    details: log.details,
    message: buildMessage(log, invoiceMap, expenseMap),
  }));

  const query = params.search?.trim().toLowerCase();
  const filtered = query
    ? items.filter(
        (item) =>
          item.message.toLowerCase().includes(query) ||
          item.actorName.toLowerCase().includes(query) ||
          item.action.toLowerCase().includes(query)
      )
    : items;

  return {
    total: filtered.length,
    logs: filtered,
  };
}
