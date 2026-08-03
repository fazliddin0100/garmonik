import type { AssistantUserContext } from '@/lib/assistant/user-context';
import { formatMoneyUz } from '@/lib/assistant/clinic-snapshot';
import { query } from '@/lib/db/query';
import { listPatientsByClinicAndCreator } from '@/lib/db/patients';
import { getDayRangeForDate, getDayRangeFromDateString, getLocalDateString } from '@/lib/kassa/date';
import { prisma } from '@/lib/kassa/prisma';
import { getRevenueReport } from '@/lib/kassa/reports';

export type UserActivitySummary = {
  dateLabel: string;
  securityEvents: { label: string; at: string }[];
  kassaInvoicesToday: number;
  kassaRevenueToday: number;
  patientsCreatedToday: number;
  patientsCreatedTotal: number;
  auditLines: string[];
};

function todayLabel(): string {
  return new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    dateStyle: 'long',
  }).format(new Date());
}

function isToday(iso: string | Date | undefined): boolean {
  if (!iso) return false;
  const s = typeof iso === 'string' ? iso : iso.toISOString();
  return s.slice(0, 10) === getLocalDateString();
}

async function loadSecurityEvents(
  clinicId: string,
  actorId: string,
  limit = 12,
): Promise<{ label: string; at: string }[]> {
  const result = await query<{
    event_type: string;
    route: string | null;
    created_at: string;
  }>(
    `select event_type, route, created_at::text as created_at
     from public.security_event_logs
     where clinic_id = $1 and actor_id = $2
     order by created_at desc
     limit $3`,
    [clinicId, actorId, limit],
  );

  return result.rows.map((row) => ({
    at: row.created_at,
    label: formatSecurityEvent(row.event_type, row.route),
  }));
}

function formatSecurityEvent(eventType: string, route: string | null): string {
  switch (eventType) {
    case 'admin_login_success':
    case 'staff_login_success':
      return 'Tizimga kirdingiz';
    case 'logout':
      return 'Tizimdan chiqdingiz';
    case 'admin_login_failed':
    case 'staff_login_failed':
      return 'Noto\'g\'ri kirish urinishi';
    case 'clinic_data_write':
      return `Ma\'lumot saqlandi${route ? `: ${route}` : ''}`;
    default:
      return eventType.replace(/_/g, ' ');
  }
}

export async function resolveKassaUserId(ctx: AssistantUserContext): Promise<string | null> {
  if (ctx.sessionKind === 'kassa') return ctx.userId;
  const user = await prisma.user.findFirst({
    where: { login: { equals: ctx.login, mode: 'insensitive' } },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function loadKassaTodayForUser(
  ctx: AssistantUserContext,
): Promise<{ invoices: number; revenue: number }> {
  const cashierId = await resolveKassaUserId(ctx);
  if (!cashierId) return { invoices: 0, revenue: 0 };
  try {
    const { start, end } = getDayRangeForDate();
    const rev = await getRevenueReport({ start, end, cashierId });
    return { invoices: rev.invoices, revenue: rev.grandTotal };
  } catch {
    return { invoices: 0, revenue: 0 };
  }
}

async function loadKassaAuditLines(ctx: AssistantUserContext, limit = 8): Promise<string[]> {
  const userId = await resolveKassaUserId(ctx);
  if (!userId) return [];
  const today = getLocalDateString();
  const { start, end } = getDayRangeFromDateString(today);

  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: { gte: start, lte: end },
    },
    include: { user: { select: { fullName: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return logs.map((log) => {
    const action = log.action.replace(/_/g, ' ').toLowerCase();
    return `${log.user?.fullName ?? 'Siz'}: ${action}`;
  });
}

export async function loadUserActivitySummary(
  ctx: AssistantUserContext,
): Promise<UserActivitySummary> {
  const [securityEvents, kassa, patients, auditLines] = await Promise.all([
    loadSecurityEvents(ctx.clinicId, ctx.userId),
    loadKassaTodayForUser(ctx),
    listPatientsByClinicAndCreator(ctx.clinicId, ctx.userId),
    ctx.sessionKind === 'kassa' || ctx.kassaRole ?
      loadKassaAuditLines(ctx)
    : Promise.resolve([] as string[]),
  ]);

  const patientsCreatedToday = patients.filter((p) =>
    isToday(String(p.created_at ?? '')),
  ).length;

  return {
    dateLabel: todayLabel(),
    securityEvents,
    kassaInvoicesToday: kassa.invoices,
    kassaRevenueToday: kassa.revenue,
    patientsCreatedToday,
    patientsCreatedTotal: patients.length,
    auditLines,
  };
}

export function formatUserActivityReply(
  ctx: AssistantUserContext,
  activity: UserActivitySummary,
): string {
  const lines: string[] = [
    `**${ctx.displayName}** — bugungi ishlar (${activity.dateLabel}):`,
    '',
  ];

  if (activity.patientsCreatedToday > 0 || activity.patientsCreatedTotal > 0) {
    lines.push(
      `• Ro'yxatdan o'tkazilgan bemorlar: bugun **${activity.patientsCreatedToday}** ta, jami siznikilar **${activity.patientsCreatedTotal}** ta`,
    );
  }

  if (activity.kassaInvoicesToday > 0 || activity.kassaRevenueToday > 0) {
    lines.push(
      `• Kassa: **${activity.kassaInvoicesToday}** ta chek, jami **${formatMoneyUz(activity.kassaRevenueToday)}**`,
    );
  }

  if (activity.auditLines.length > 0) {
    lines.push('', '**Kassa harakatlari:**');
    activity.auditLines.slice(0, 6).forEach((l) => lines.push(`• ${l}`));
  }

  const recent = activity.securityEvents.slice(0, 8);
  if (recent.length > 0) {
    lines.push('', '**So\'nggi harakatlar:**');
    for (const ev of recent) {
      const time = ev.at.slice(11, 16);
      lines.push(`• ${time} — ${ev.label}`);
    }
  }

  if (lines.length <= 2) {
    lines.push(
      'Bugun tizimda sizning nomingiz bilan qayd etilgan harakatlar topilmadi. Savol bering: «Mening huquqlarim nima?»',
    );
  }

  return lines.join('\n');
}
