export type ReportPeriodId = 'today' | 'month' | 'year';

export type ReportPeriodRange = {
  from: Date;
  to: Date;
  period: ReportPeriodId;
  label: string;
};

export function parseReportPeriod(
  searchParams: URLSearchParams,
): ReportPeriodRange {
  const period = (searchParams.get('period') || 'month') as ReportPeriodId;
  const now = new Date();
  const uzNow = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }),
  );
  const y = uzNow.getFullYear();
  const m = uzNow.getMonth();
  const d = uzNow.getDate();

  const dayStart = (yy: number, mm: number, dd: number) =>
    new Date(
      `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T00:00:00+05:00`,
    );
  const dayEnd = (yy: number, mm: number, dd: number) =>
    new Date(
      `${yy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}T23:59:59.999+05:00`,
    );

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

export function inReportRange(
  iso: string | undefined,
  from: Date,
  to: Date,
): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function buildReportByDayBuckets(
  period: ReportPeriodId,
  from: Date,
  to: Date,
  countForRange: (from: Date, to: Date) => number,
): { label: string; date: string; count: number }[] {
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
      byDay.push({
        label: `${String(dd).padStart(2, '0')}.${String(mm + 1).padStart(2, '0')}`,
        date: dayFrom.toISOString(),
        count: countForRange(dayFrom, dayTo),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return byDay;
  }

  if (period === 'year') {
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
    for (let month0 = 0; month0 < 12; month0 += 1) {
      const monthFrom = new Date(from.getFullYear(), month0, 1);
      monthFrom.setHours(0, 0, 0, 0);
      const last = new Date(from.getFullYear(), month0 + 1, 0).getDate();
      const monthTo = new Date(
        `${from.getFullYear()}-${String(month0 + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}T23:59:59.999+05:00`,
      );
      byDay.push({
        label: MONTH_SHORT[month0] ?? String(month0 + 1),
        date: monthFrom.toISOString(),
        count: countForRange(monthFrom, monthTo),
      });
    }
  }

  return byDay;
}
