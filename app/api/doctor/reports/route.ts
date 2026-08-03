import { getVerifiedSessionFromRequest } from '@/lib/auth/request-session';
import type { ClinicPortalSession } from '@/lib/auth/session-guards';
import { sessionPersonName } from '@/lib/auth/session-guards';
import { readClinicResourcePayload } from '@/lib/db/clinic-json-resources';
import { listPatientSummariesByClinic } from '@/lib/db/patients';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import { isDoctorClinicalPatient } from '@/lib/patients/clinical-attendance';
import {
  buildReportByDayBuckets,
  inReportRange,
  parseReportPeriod,
} from '@/lib/reports/period-range';
import { NextRequest, NextResponse } from 'next/server';
type SupabasePatient = {
  id: string;
  card_number: string;
  full_name: string;
  disease_type: string;
  gender: string | null;
};

type DoctorServiceRecord = {
  patientId: string;
  cardNumber: string;
  fullName: string;
  diseaseType: string;
  gender: string;
  completedAt: string;
  labOrderCount: number;
  hasDiagnosisNote: boolean;
};

function isDoctorSession(
  session: Awaited<ReturnType<typeof getVerifiedSessionFromRequest>>,
): session is ClinicPortalSession {
  if (!session || session.kind === 'kassa') return false;
  if (session.kind === 'staff') {
    return session.role === 'doctor' || session.role === 'shifokor';
  }
  if (session.kind === 'admin') {
    return session.routeGroup === 'clinical';
  }
  return false;
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSessionFromRequest(request);
  if (!session || !isDoctorSession(session)) {
    return NextResponse.json({ error: 'Ruxsat yo‘q' }, { status: 403 });
  }

  const doctorId = session.id;
  const doctorName = sessionPersonName(session);
  const { from, to, period, label } = parseReportPeriod(request.nextUrl.searchParams);

  const [supaPatients, jsonPatientsRaw] = await Promise.all([
    listPatientSummariesByClinic(session.clinicId),
    readClinicResourcePayload(session.clinicId, 'patients'),
  ]);

  const supaById = new Map<string, SupabasePatient>();
  for (const p of supaPatients) {
    supaById.set(p.id, p as SupabasePatient);
  }

  const jsonRaw = Array.isArray(jsonPatientsRaw) ? jsonPatientsRaw : [];
  const allServices: DoctorServiceRecord[] = [];

  for (const item of jsonRaw) {
    const clinical = normalizePatientRow(item);
    if (!clinical) continue;
    if (!isDoctorClinicalPatient(clinical, doctorId)) continue;

    const completedAt = clinical.clinicalCompletedAt?.trim();
    if (!completedAt) continue;

    const supa = supaById.get(clinical.id);

    allServices.push({
      patientId: clinical.id,
      cardNumber: clinical.cardNumber ?? supa?.card_number ?? clinical.id,
      fullName: clinical.fullName || supa?.full_name || '—',
      diseaseType: clinical.diseaseType || supa?.disease_type || '—',
      gender: clinical.gender || supa?.gender || '—',
      completedAt,
      labOrderCount: clinical.orderedLaboratoryKeys?.length ?? 0,
      hasDiagnosisNote: Boolean(clinical.queueClinicalNote?.trim()),
    });
  }

  const inPeriod = allServices.filter((s) =>
    inReportRange(s.completedAt, from, to),
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
  const servedToday = allServices.filter((s) =>
    inReportRange(s.completedAt, todayFrom, todayTo),
  ).length;

  const labOrdersInPeriod = inPeriod.reduce((acc, s) => acc + s.labOrderCount, 0);

  const diseaseMap = new Map<string, number>();
  for (const s of inPeriod) {
    const key = s.diseaseType.trim() || 'Belgilanmagan';
    diseaseMap.set(key, (diseaseMap.get(key) ?? 0) + 1);
  }
  const byDiseaseType = [...diseaseMap.entries()]
    .map(([labelKey, count]) => ({ label: labelKey, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'uz'));

  const byDay = buildReportByDayBuckets(period, from, to, (dayFrom, dayTo) =>
    inPeriod.filter((s) => inReportRange(s.completedAt, dayFrom, dayTo)).length,
  );

  return NextResponse.json({
    period: { id: period, label, from: from.toISOString(), to: to.toISOString() },
    doctor: { id: doctorId, fullName: doctorName },
    summary: {
      patientsServedInPeriod: inPeriod.length,
      labOrdersInPeriod,
      servedToday,
      totalServedAllTime: allServices.length,
      totalLabOrdersAllTime: allServices.reduce((a, s) => a + s.labOrderCount, 0),
    },
    byDiseaseType,
    byDay,
    recent: [...inPeriod]
      .sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      )
      .slice(0, 25)
      .map((s) => ({
        id: s.patientId,
        cardNumber: s.cardNumber,
        fullName: s.fullName,
        diseaseType: s.diseaseType,
        gender: s.gender,
        labOrderCount: s.labOrderCount,
        hasDiagnosisNote: s.hasDiagnosisNote,
        completedAt: s.completedAt,
      })),
  });
}
