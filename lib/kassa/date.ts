export const CLINIC_TIMEZONE = "Asia/Tashkent";

/** YYYY-MM-DD — klinika vaqti bo'yicha */
export function getLocalDateString(date = new Date(), timeZone = CLINIC_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

/** YYYY-MM-DD satrini Prisma @db.Date uchun (UTC, filtr va saqlash bir xil) */
export function parseClinicDateString(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** YYYY-MM oy oralig'i (inclusive) */
export function getMonthDateBounds(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/** YYYY yil oralig'i (inclusive) */
export function getYearDateBounds(yearStr: string) {
  const year = Number(yearStr);
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  };
}

/** Kun boshlanishi va oxiri (Toshkent, UTC+5) */
export function getDayRangeFromDateString(dateStr: string) {
  return {
    start: new Date(`${dateStr}T00:00:00+05:00`),
    end: new Date(`${dateStr}T23:59:59.999+05:00`),
  };
}

export function getDayRangeForDate(date = new Date()) {
  return getDayRangeFromDateString(getLocalDateString(date));
}

/** YYYY-MM */
export function getMonthRangeFromString(monthStr: string) {
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:00`),
    end: new Date(
      `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59.999+05:00`
    ),
  };
}

/** YYYY */
export function getYearRangeFromString(yearStr: string) {
  const year = Number(yearStr);
  return {
    start: new Date(`${year}-01-01T00:00:00+05:00`),
    end: new Date(`${year}-12-31T23:59:59.999+05:00`),
  };
}

/** YYYY-MM-DD oralig'ini tartibga soladi (inclusive) */
export function normalizeDateRange(from: string, to: string): [string, string] {
  return from <= to ? [from, to] : [to, from];
}

/** YYYY-MM-DD kun oralig'i (inclusive, Toshkent) */
export function getDateRangeFromStrings(from: string, to: string) {
  const [fromNorm, toNorm] = normalizeDateRange(from, to);
  return {
    start: new Date(`${fromNorm}T00:00:00+05:00`),
    end: new Date(`${toNorm}T23:59:59.999+05:00`),
  };
}

export function isDateInRange(date: string, from: string, to: string) {
  const [a, b] = normalizeDateRange(from, to);
  return date >= a && date <= b;
}

export function formatUzDateRangeLabel(from: string, to: string) {
  if (from === to) {
    return formatUzDateLong(new Date(`${from}T12:00:00+05:00`));
  }
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: CLINIC_TIMEZONE,
    day: "numeric",
    month: "long",
  };
  if (from.slice(0, 4) !== to.slice(0, 4)) {
    opts.year = "numeric";
  }
  const fmt = (s: string) =>
    new Intl.DateTimeFormat("uz-UZ", {
      ...opts,
      year: s.slice(0, 4) !== from.slice(0, 4) || s.slice(0, 4) !== to.slice(0, 4) ? "numeric" : opts.year,
    }).format(new Date(`${s}T12:00:00+05:00`));
  return `${fmt(from)} — ${fmt(to)}`;
}

export function formatUzDateLong(date = new Date()) {
  return new Intl.DateTimeFormat("uz-UZ", {
    timeZone: CLINIC_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
