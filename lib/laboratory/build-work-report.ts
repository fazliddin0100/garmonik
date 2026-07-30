import type { LaboratoryResultEntry } from '@/lib/patients/laboratory-results';
import { resolveLabOrders } from '@/lib/patients/resolve-order-labels';
import type { PatientRow } from '@/lib/patients/types';
import {
  buildReportByDayBuckets,
  inReportRange,
  type ReportPeriodRange,
} from '@/lib/reports/period-range';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import type { ServicePriceRow } from '@/lib/services/pricing-data';

export type LabWorkItem = {
  id: string;
  patientId: string;
  patientName: string;
  cardNumber: string;
  testLabel: string;
  categoryTitle?: string;
  resultValue: string;
  enteredAt: string;
};

export type LaboratoryWorkReport = {
  period: { id: string; label: string; from: string; to: string };
  staff: { login: string; fullName: string };
  summary: {
    testsInPeriod: number;
    patientsInPeriod: number;
    testsToday: number;
    testsAllTime: number;
  };
  byTestType: { label: string; count: number }[];
  byDay: { label: string; date: string; count: number }[];
  items: LabWorkItem[];
};

function staffIdentity(session: {
  login: string;
  fullName: string;
}): { login: string; fullName: string } {
  return {
    login: session.login.trim().toLowerCase(),
    fullName: session.fullName.trim(),
  };
}

export function isLabResultByStaff(
  result: LaboratoryResultEntry,
  staff: { login: string; fullName: string },
): boolean {
  if (!result.value.trim()) return false;
  const entryLogin = result.enteredByLogin?.trim().toLowerCase();
  const entryName = result.enteredByName?.trim().toLowerCase();
  if (entryLogin && entryLogin === staff.login) return true;
  if (entryName && staff.fullName && entryName === staff.fullName.toLowerCase()) {
    return true;
  }
  return false;
}

function collectStaffLabItems(
  patients: PatientRow[],
  staff: { login: string; fullName: string },
  catalog: LabCategory[],
  prices: ServicePriceRow[],
): LabWorkItem[] {
  const labelCache = new Map<string, { label: string; categoryTitle?: string }>();
  const items: LabWorkItem[] = [];

  for (const patient of patients) {
    const results = patient.laboratoryResults ?? [];
    for (const result of results) {
      if (!isLabResultByStaff(result, staff)) continue;
      const enteredAt = result.enteredAt?.trim();
      if (!enteredAt) continue;

      let meta = labelCache.get(result.orderKey);
      if (!meta) {
        const resolved = resolveLabOrders([result.orderKey], catalog, prices)[0];
        meta = {
          label: resolved?.label ?? result.orderKey,
          categoryTitle: resolved?.categoryTitle,
        };
        labelCache.set(result.orderKey, meta);
      }

      items.push({
        id: `${patient.id}:${result.orderKey}:${enteredAt}`,
        patientId: patient.id,
        patientName: patient.fullName,
        cardNumber: patient.cardNumber ?? patient.id,
        testLabel: meta.label,
        categoryTitle: meta.categoryTitle,
        resultValue: result.value.trim(),
        enteredAt,
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime(),
  );
}

export function buildLaboratoryWorkReport(input: {
  patients: PatientRow[];
  catalog: LabCategory[];
  prices: ServicePriceRow[];
  staffLogin: string;
  staffFullName: string;
  range: ReportPeriodRange;
}): LaboratoryWorkReport {
  const staff = staffIdentity({
    login: input.staffLogin,
    fullName: input.staffFullName,
  });
  const allItems = collectStaffLabItems(
    input.patients,
    staff,
    input.catalog,
    input.prices,
  );

  const inPeriod = allItems.filter((item) =>
    inReportRange(item.enteredAt, input.range.from, input.range.to),
  );

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
  const testsToday = allItems.filter((item) =>
    inReportRange(item.enteredAt, todayFrom, todayTo),
  ).length;

  const patientsInPeriod = new Set(inPeriod.map((i) => i.patientId)).size;

  const testMap = new Map<string, number>();
  for (const item of inPeriod) {
    testMap.set(item.testLabel, (testMap.get(item.testLabel) ?? 0) + 1);
  }
  const byTestType = [...testMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'uz'));

  const byDay = buildReportByDayBuckets(
    input.range.period,
    input.range.from,
    input.range.to,
    (dayFrom, dayTo) =>
      inPeriod.filter((item) => inReportRange(item.enteredAt, dayFrom, dayTo)).length,
  );

  return {
    period: {
      id: input.range.period,
      label: input.range.label,
      from: input.range.from.toISOString(),
      to: input.range.to.toISOString(),
    },
    staff: { login: input.staffLogin, fullName: input.staffFullName },
    summary: {
      testsInPeriod: inPeriod.length,
      patientsInPeriod,
      testsToday,
      testsAllTime: allItems.length,
    },
    byTestType,
    byDay,
    items: inPeriod.slice(0, 100),
  };
}
