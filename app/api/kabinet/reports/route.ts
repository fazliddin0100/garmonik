import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import { readClinicResourcePayload } from '@/lib/db/clinic-json-resources';
import { listPatientsByClinic } from '@/lib/db/patients';
import type { QueueRow } from '@/lib/queue/types';
import { NextRequest, NextResponse } from 'next/server';

type PeriodId = 'today' | 'month' | 'year';

type PatientRow = {
  id: string;
  card_number: string;
  full_name: string;
  disease_type: string;
  gender: string | null;
  created_at: string;
  created_by_user_id: string | null;
};

function parsePeriod(
  searchParams: URLSearchParams,
): { from: Date; to: Date; period: PeriodId; label: string } {
  const period = (searchParams.get('period') || 'month') as PeriodId;
  const now = new Date();
  const uzNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
  );
  const y = uzNow.getFullYear();
  const m = uzNow.getMonth();
  const d = uzNow.getDate();

  const dayStart = (yy: number, mm: number, dd: number) =>
    new Date(`${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00+05:00`);
  const dayEnd = (yy: number, mm: number, dd: number) =>
    new Date(`${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T23:59:59.999+05:00`);

  if (period === 'today') {
    return {
      from: dayStart(y, m, d),
      to: dayEnd(y, m, d),
      period,
      label: 'Bugun',
    };
  }

  if (period === 'year') {
    const yearParam = Number.parseInt(searchParams.get('year') || String(y), 10);
    const year = Number.isFinite(yearParam) ? yearParam : y;
    return {
      from: new Date(`${year}-01-01T00:00:00+05:00`),
      to: new Date(`${year}-12-31T23:59:59.999+05:00`),
      period,
      label: `${year} yil`,
    };
  }

  const yearParam = Number.parseInt(searchParams.get('year') || String(y), 10);
  const monthParam = Number.parseInt(
    searchParams.get('month') || String(m + 1),
    10,
  );
  const year = Number.isFinite(yearParam) ? yearParam : y;
  const month = Number.isFinite(monthParam) ? monthParam : m + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const MONTH_UZ = [
    'yanvar',
    'fevral',
    'mart',
    'aprel',
    'may',
    'iyun',
    'iyul',
    'avgust',
    'sentyabr',
    'oktyabr',
    'noyabr',
    'dekabr',
  ];
  return {
    from: new Date(
      `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:00`,
    ),
    to: new Date(
      `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:00`,
    ),
    period: 'month',
    label: `${MONTH_UZ[month - 1] ?? month} ${year}`,
  };
}

function inRange(iso: string | undefined, from: Date, to: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function countByField(
  rows: PatientRow[],
  field: 'disease_type' | 'gender',
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const raw = field === 'gender' ? row.gender : row.disease_type;
    const label =
      typeof raw === 'string' && raw.trim() ? raw.trim()
      : field === 'gender' ? 'Ko‘rsatilmagan'
      : 'Belgilanmagan';
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'uz'));
}

function canViewKabinetReports(
  session: Awaited<ReturnType<typeof getVerifiedSessionFromRequest>>,
): session is NonNullable<typeof session> {
  if (!session) return false;
  if (session.kind === 'staff' && session.role === 'kabinet') return true;
  if (session.kind === 'admin' && session.routeGroup === 'office') return true;
  return false;
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!canViewKabinetReports(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const { from, to, period, label } = parsePeriod(request.nextUrl.searchParams);

  try {
  const [patients, queuePayload] = await Promise.all([
    listPatientsByClinic(session.clinicId),
    readClinicResourcePayload(session.clinicId, 'queue'),
  ]);

  const all = patients as PatientRow[];
  const patientIds = new Set(all.map((p) => p.id));
  const inPeriod = all.filter((p) => inRange(p.created_at, from, to));
  const mine = all.filter((p) => p.created_by_user_id === session.id);
  const mineInPeriod = mine.filter((p) => inRange(p.created_at, from, to));

  const queueRows = Array.isArray(queuePayload) ?
    (queuePayload as QueueRow[])
  : [];
  const queuedInPeriod = queueRows.filter(
    (q) => patientIds.has(q.patientId) && inRange(q.createdAt, from, to),
  ).length;
  const currentlyInQueueTotal = queueRows.length;
  const registeredPatientsInQueue = queueRows.filter((q) =>
    patientIds.has(q.patientId),
  ).length;

  const uzNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
  );
  const ty = uzNow.getFullYear();
  const tm = uzNow.getMonth();
  const td = uzNow.getDate();
  const todayFrom = new Date(
    `${ty}-${String(tm + 1).padStart(2, '0')}-${String(td).padStart(2, '0')}T00:00:00+05:00`,
  );
  const todayTo = new Date(
    `${ty}-${String(tm + 1).padStart(2, '0')}-${String(td).padStart(2, '0')}T23:59:59.999+05:00`,
  );
  const registeredToday = all.filter((p) =>
    inRange(p.created_at, todayFrom, todayTo),
  ).length;

  const byDay: { label: string; date: string; count: number }[] = [];
  if (period === 'month' || period === 'today') {
    const cursor = new Date(from);
    while (cursor.getTime() <= to.getTime()) {
      const yy = cursor.getFullYear();
      const mm = cursor.getMonth();
      const dd = cursor.getDate();
      const dayFrom = new Date(
        `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00+05:00`,
      );
      const dayTo = new Date(
        `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T23:59:59.999+05:00`,
      );
      const count = all.filter((p) => inRange(p.created_at, dayFrom, dayTo)).length;
      byDay.push({
        label: `${String(dd).padStart(2, '0')}.${String(mm + 1).padStart(2, '0')}`,
        date: dayFrom.toISOString(),
        count,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (period === 'year') {
    for (let month0 = 0; month0 < 12; month0 += 1) {
      const monthFrom = new Date(from.getFullYear(), month0, 1);
      monthFrom.setHours(0, 0, 0, 0);
      const last = new Date(from.getFullYear(), month0 + 1, 0).getDate();
      const monthTo = new Date(
        `${from.getFullYear()}-${String(month0 + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}T23:59:59.999+05:00`,
      );
      const count = all.filter((p) => inRange(p.created_at, monthFrom, monthTo)).length;
      const MONTH_SHORT = [
        'Yan',
        'Fev',
        'Mar',
        'Apr',
        'May',
        'Iyn',
        'Iyl',
        'Avg',
        'Sen',
        'Okt',
        'Noy',
        'Dek',
      ];
      byDay.push({
        label: MONTH_SHORT[month0] ?? String(month0 + 1),
        date: monthFrom.toISOString(),
        count,
      });
    }
  }

  return NextResponse.json({
    period: { id: period, label, from: from.toISOString(), to: to.toISOString() },
    operator: { id: session.id, fullName: session.fullName },
    summary: {
      registeredInPeriod: inPeriod.length,
      queuedInPeriod,
      registeredToday,
      totalAllTime: all.length,
      currentlyInQueueTotal,
      registeredPatientsInQueue,
      registeredByMeInPeriod: mineInPeriod.length,
      registeredByMeAllTime: mine.length,
    },
    byDiseaseType: countByField(inPeriod, 'disease_type'),
    byGender: countByField(inPeriod, 'gender'),
    byDay,
    recent: inPeriod.slice(0, 20).map((p) => ({
      id: p.id,
      cardNumber: p.card_number,
      fullName: p.full_name,
      diseaseType: p.disease_type || '—',
      gender: p.gender || '—',
      createdAt: p.created_at,
    })),
  });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Hisobot yuklanmadi';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
