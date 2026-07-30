export type InpatientAdmissionRequest = {
  requestedAt: string;
  requestedByName?: string;
  requestedByLogin?: string;
  note?: string;
  /** Kassada statsionar xona to‘lovi qilingan vaqt */
  roomPaymentAt?: string;
  /** To‘langan xona sig‘imi (2/3/4) */
  paidRoomCapacity?: 2 | 3 | 4;
  paidRoomServiceName?: string;
  /** Kassada to‘langan summa */
  roomPaymentAmountPaid?: number;
  /** Qolgan qarz (qisman to‘lov) */
  roomPaymentBalanceDue?: number;
};

export type InpatientVitals = {
  bp?: string;
  pulse?: string;
  temp?: string;
  spo2?: string;
};

export type InpatientRoundEntry = {
  id: string;
  date: string;
  time: string;
  vitals?: InpatientVitals;
  note: string;
  recordedByName?: string;
  recordedByLogin?: string;
};

export type InpatientFollowUpEntry = {
  id: string;
  date: string;
  note: string;
  recordedByName?: string;
};

export type InpatientStatus = 'admitted' | 'home_monitoring' | 'discharged';

export type InpatientAdmission = {
  id: string;
  patientId: string;
  patientName: string;
  cardNumber?: string;
  diseaseType?: string;
  contact?: string;
  admittedAt: string;
  admittedByName?: string;
  admittedByLogin?: string;
  roomId: string;
  roomName: string;
  bedLabel?: string;
  /** 0-based karavot indeksi (palata ichidagi o‘rin) */
  bedIndex?: number;
  /** Kassada to‘langan xona sig‘imi (2/3/4) */
  paidRoomCapacity?: 2 | 3 | 4;
  /** Rejalashtirilgan chiqish sanasi (YYYY-MM-DD) */
  plannedStayUntil?: string;
  attendingDoctorName?: string;
  admissionNote?: string;
  status: InpatientStatus;
  dischargeAt?: string;
  dischargeNote?: string;
  homeMonitoringPlan?: string;
  dailyRounds: InpatientRoundEntry[];
  homeFollowUps: InpatientFollowUpEntry[];
};

export const INPATIENT_ADMISSIONS_KEY = 'inpatient-admissions';

export function normalizeInpatientAdmission(raw: unknown): InpatientAdmission | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id.trim() : '';
  const patientId = typeof r.patientId === 'string' ? r.patientId.trim() : '';
  const patientName = typeof r.patientName === 'string' ? r.patientName.trim() : '';
  if (!id || !patientId || !patientName) return null;

  const statusRaw = typeof r.status === 'string' ? r.status : 'admitted';
  const status: InpatientStatus =
    statusRaw === 'home_monitoring' || statusRaw === 'discharged' ? statusRaw : 'admitted';

  const rounds = Array.isArray(r.dailyRounds) ? r.dailyRounds : [];
  const followUps = Array.isArray(r.homeFollowUps) ? r.homeFollowUps : [];

  return {
    id,
    patientId,
    patientName,
    cardNumber: typeof r.cardNumber === 'string' ? r.cardNumber : undefined,
    diseaseType: typeof r.diseaseType === 'string' ? r.diseaseType : undefined,
    contact: typeof r.contact === 'string' ? r.contact : undefined,
    admittedAt: typeof r.admittedAt === 'string' ? r.admittedAt : new Date().toISOString(),
    admittedByName: typeof r.admittedByName === 'string' ? r.admittedByName : undefined,
    admittedByLogin: typeof r.admittedByLogin === 'string' ? r.admittedByLogin : undefined,
    roomId: typeof r.roomId === 'string' ? r.roomId : '',
    roomName: typeof r.roomName === 'string' ? r.roomName : '',
    bedLabel: typeof r.bedLabel === 'string' ? r.bedLabel : undefined,
    bedIndex: typeof r.bedIndex === 'number' && r.bedIndex >= 0 ? r.bedIndex : undefined,
    paidRoomCapacity:
      r.paidRoomCapacity === 2 || r.paidRoomCapacity === 3 || r.paidRoomCapacity === 4 ?
        r.paidRoomCapacity
      : undefined,
    plannedStayUntil:
      typeof r.plannedStayUntil === 'string' ? r.plannedStayUntil : undefined,
    attendingDoctorName:
      typeof r.attendingDoctorName === 'string' ? r.attendingDoctorName : undefined,
    admissionNote: typeof r.admissionNote === 'string' ? r.admissionNote : undefined,
    status,
    dischargeAt: typeof r.dischargeAt === 'string' ? r.dischargeAt : undefined,
    dischargeNote: typeof r.dischargeNote === 'string' ? r.dischargeNote : undefined,
    homeMonitoringPlan:
      typeof r.homeMonitoringPlan === 'string' ? r.homeMonitoringPlan : undefined,
    dailyRounds: rounds
      .map(normalizeRoundEntry)
      .filter((x): x is InpatientRoundEntry => x !== null),
    homeFollowUps: followUps
      .map(normalizeFollowUpEntry)
      .filter((x): x is InpatientFollowUpEntry => x !== null),
  };
}

function normalizeRoundEntry(raw: unknown): InpatientRoundEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const date = typeof r.date === 'string' ? r.date : '';
  const note = typeof r.note === 'string' ? r.note : '';
  if (!id || !date) return null;
  const vitalsRaw = r.vitals;
  let vitals: InpatientVitals | undefined;
  if (vitalsRaw && typeof vitalsRaw === 'object') {
    const v = vitalsRaw as Record<string, unknown>;
    vitals = {
      bp: typeof v.bp === 'string' ? v.bp : undefined,
      pulse: typeof v.pulse === 'string' ? v.pulse : undefined,
      temp: typeof v.temp === 'string' ? v.temp : undefined,
      spo2: typeof v.spo2 === 'string' ? v.spo2 : undefined,
    };
  }
  return {
    id,
    date,
    time: typeof r.time === 'string' ? r.time : '',
    vitals,
    note,
    recordedByName: typeof r.recordedByName === 'string' ? r.recordedByName : undefined,
    recordedByLogin: typeof r.recordedByLogin === 'string' ? r.recordedByLogin : undefined,
  };
}

function normalizeFollowUpEntry(raw: unknown): InpatientFollowUpEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const date = typeof r.date === 'string' ? r.date : '';
  const note = typeof r.note === 'string' ? r.note : '';
  if (!id || !date || !note) return null;
  return {
    id,
    date,
    note,
    recordedByName: typeof r.recordedByName === 'string' ? r.recordedByName : undefined,
  };
}

export function normalizeAdmissionRequest(raw: unknown): InpatientAdmissionRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const requestedAt = typeof r.requestedAt === 'string' ? r.requestedAt : '';
  if (!requestedAt) return null;
  return {
    requestedAt,
    requestedByName: typeof r.requestedByName === 'string' ? r.requestedByName : undefined,
    requestedByLogin: typeof r.requestedByLogin === 'string' ? r.requestedByLogin : undefined,
    note: typeof r.note === 'string' ? r.note : undefined,
    roomPaymentAt: typeof r.roomPaymentAt === 'string' ? r.roomPaymentAt : undefined,
    paidRoomCapacity:
      r.paidRoomCapacity === 2 || r.paidRoomCapacity === 3 || r.paidRoomCapacity === 4 ?
        r.paidRoomCapacity
      : undefined,
    paidRoomServiceName:
      typeof r.paidRoomServiceName === 'string' ? r.paidRoomServiceName : undefined,
    roomPaymentAmountPaid:
      typeof r.roomPaymentAmountPaid === 'number' && r.roomPaymentAmountPaid >= 0 ?
        r.roomPaymentAmountPaid
      : undefined,
    roomPaymentBalanceDue:
      typeof r.roomPaymentBalanceDue === 'number' && r.roomPaymentBalanceDue >= 0 ?
        r.roomPaymentBalanceDue
      : undefined,
  };
}
