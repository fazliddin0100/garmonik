import { countAppointmentRequestsByClinic } from '@/lib/db/appointment-requests';
import { queryOne } from '@/lib/db/query';
import { readClinicResourcePayload } from '@/lib/db/clinic-json-resources';
import {
  normalizeInpatientAdmission,
  type InpatientAdmission,
} from '@/lib/inpatient/types';
import { getRevenueReport } from '@/lib/kassa/reports';
import { getDayRangeForDate, getLocalDateString } from '@/lib/kassa/date';
import { formatMoney } from '@/lib/kassa/utils';
import { readClinicQueueRows } from '@/lib/queue/clinic-queue-store';
import {
  isVisibleToDoctor,
  isWaitingPayment,
  type QueueRow,
} from '@/lib/queue/types';

export type ClinicSnapshot = {
  fetchedAt: string;
  dateLabel: string;
  patientsTotal: number;
  inpatientsActive: number;
  inpatientsHomeMonitoring: number;
  inpatientsDischargedTotal: number;
  inpatientsDischargedToday: number;
  activeInpatients: InpatientAdmission[];
  queueTotal: number;
  queueWaitingPayment: number;
  queueWithDoctor: number;
  queueReadyForDoctor: number;
  queueCompleted: number;
  appointmentRequestsNew: number;
  appointmentRequestsTotal: number;
  kassaTodayRevenue: number;
  kassaTodayPayments: number;
  kassaTodayInvoices: number;
  doctorsCount: number;
  servicesCount: number;
  departmentsCount: number;
};

let snapshotCache: { clinicId: string; at: number; data: ClinicSnapshot } | null = null;
const CACHE_MS = 15_000;

function normalizeInpatients(payload: unknown): InpatientAdmission[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map(normalizeInpatientAdmission)
    .filter((x): x is InpatientAdmission => x !== null);
}

function isTodayIso(iso: string | undefined, today: string): boolean {
  if (!iso) return false;
  return iso.slice(0, 10) === today;
}

export async function loadClinicSnapshot(clinicId: string): Promise<ClinicSnapshot> {
  const now = Date.now();
  if (
    snapshotCache &&
    snapshotCache.clinicId === clinicId &&
    now - snapshotCache.at < CACHE_MS
  ) {
    return snapshotCache.data;
  }

  const today = getLocalDateString();
  const dateLabel = new Intl.DateTimeFormat('uz-UZ', {
    timeZone: 'Asia/Tashkent',
    dateStyle: 'long',
  }).format(new Date());

  const patientsRow = await queryOne<{ count: string }>(
    `select count(*)::text as count from public.patients where clinic_id = $1`,
    [clinicId],
  );

  const inpatientPayload = await readClinicResourcePayload(clinicId, 'inpatient-admissions');
  const inpatients = normalizeInpatients(inpatientPayload);

  const activeInpatients = inpatients.filter(
    (a) => a.status === 'admitted' || a.status === 'home_monitoring',
  );

  const queue: QueueRow[] = await readClinicQueueRows(clinicId);

  let kassaTodayRevenue = 0;
  let kassaTodayPayments = 0;
  let kassaTodayInvoices = 0;
  try {
    const { start, end } = getDayRangeForDate();
    const rev = await getRevenueReport({ start, end });
    kassaTodayRevenue = rev.grandTotal;
    kassaTodayPayments = rev.transactionCount;
    kassaTodayInvoices = rev.invoices;
  } catch {
    /* kassa schema bo'lmasa */
  }

  const [doctorsPayload, servicesPayload, departmentsPayload] = await Promise.all([
    readClinicResourcePayload(clinicId, 'doctors'),
    readClinicResourcePayload(clinicId, 'medical-services'),
    readClinicResourcePayload(clinicId, 'departments'),
  ]);

  const doctorsCount = Array.isArray(doctorsPayload) ? doctorsPayload.length : 0;
  const servicesCount = Array.isArray(servicesPayload) ? servicesPayload.length : 0;
  const departmentsCount = Array.isArray(departmentsPayload) ? departmentsPayload.length : 0;

  const [appointmentRequestsNew, appointmentRequestsTotal] = await Promise.all([
    countAppointmentRequestsByClinic(clinicId, 'new'),
    countAppointmentRequestsByClinic(clinicId),
  ]);

  const data: ClinicSnapshot = {
    fetchedAt: new Date().toISOString(),
    dateLabel,
    patientsTotal: Number.parseInt(patientsRow?.count ?? '0', 10) || 0,
    inpatientsActive: inpatients.filter((a) => a.status === 'admitted').length,
    inpatientsHomeMonitoring: inpatients.filter((a) => a.status === 'home_monitoring').length,
    inpatientsDischargedTotal: inpatients.filter((a) => a.status === 'discharged').length,
    inpatientsDischargedToday: inpatients.filter(
      (a) => a.status === 'discharged' && isTodayIso(a.dischargeAt, today),
    ).length,
    activeInpatients,
    queueTotal: queue.length,
    queueWaitingPayment: queue.filter(isWaitingPayment).length,
    queueWithDoctor: queue.filter((r) => (r.status ?? '') === 'with_doctor').length,
    queueReadyForDoctor: queue.filter(isVisibleToDoctor).length,
    queueCompleted: queue.filter((r) => (r.status ?? '') === 'completed').length,
    appointmentRequestsNew,
    appointmentRequestsTotal,
    kassaTodayRevenue,
    kassaTodayPayments,
    kassaTodayInvoices,
    doctorsCount,
    servicesCount,
    departmentsCount,
  };

  snapshotCache = { clinicId, at: now, data };
  return data;
}

export function formatInpatientList(items: InpatientAdmission[], max = 6): string {
  if (items.length === 0) return '';
  const slice = items.slice(0, max);
  const lines = slice.map((a) => {
    const room = a.roomName ? ` — ${a.roomName}` : '';
    const st =
      a.status === 'home_monitoring' ? ' (uyda kuzatuv)'
      : '';
    return `• ${a.patientName}${room}${st}`;
  });
  const more = items.length > max ? `\n… va yana ${items.length - max} ta` : '';
  return `${lines.join('\n')}${more}`;
}

export function formatMoneyUz(n: number): string {
  try {
    return formatMoney(n);
  } catch {
    return `${Math.round(n).toLocaleString('uz-UZ')} so'm`;
  }
}
