import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import type { ClinicPortalSession } from '@/lib/auth/session-guards';
import { readClinicResourcePayload } from '@/lib/db/clinic-json-resources';
import { buildLaboratoryWorkReport } from '@/lib/laboratory/build-work-report';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import type { PatientRow } from '@/lib/patients/types';
import { parseReportPeriod } from '@/lib/reports/period-range';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import { NextRequest, NextResponse } from 'next/server';

function isLaboratorySession(
  session: Awaited<ReturnType<typeof getVerifiedSessionFromRequest>>,
): session is ClinicPortalSession {
  if (!session || session.kind === 'kassa') return false;
  if (session.kind === 'staff' && session.role === 'laboratory') return true;
  if (session.kind === 'admin' && session.routeGroup === 'laboratory') return true;
  return false;
}

function sessionStaffIdentity(session: ClinicPortalSession) {
  if (session.kind === 'staff') {
    return { login: session.login, fullName: session.fullName, clinicId: session.clinicId };
  }
  return {
    login: session.login,
    fullName: session.displayName,
    clinicId: session.clinicId,
  };
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!session || !isLaboratorySession(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const staff = sessionStaffIdentity(session);
  const range = parseReportPeriod(request.nextUrl.searchParams);

  const [patientsRaw, pricesRaw, catalogRaw] = await Promise.all([
    readClinicResourcePayload(staff.clinicId, 'patients'),
    readClinicResourcePayload(staff.clinicId, 'service-prices'),
    readClinicResourcePayload(staff.clinicId, 'lab-catalog'),
  ]);

  const patients: PatientRow[] = [];
  if (Array.isArray(patientsRaw)) {
    for (const item of patientsRaw) {
      const row = normalizePatientRow(item);
      if (row) patients.push(row);
    }
  }

  const prices: ServicePriceRow[] = Array.isArray(pricesRaw)
    ? (pricesRaw as ServicePriceRow[])
    : [];
  const catalog: LabCategory[] = Array.isArray(catalogRaw) ? (catalogRaw as LabCategory[]) : [];

  const report = buildLaboratoryWorkReport({
    patients,
    catalog,
    prices,
    staffLogin: staff.login,
    staffFullName: staff.fullName,
    range,
  });

  return NextResponse.json(report);
}
