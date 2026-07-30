export type QueuePaymentStatus =
  | 'waiting_payment'
  | 'ready_for_doctor'
  | 'with_doctor'
  | 'waiting_post_payment'
  | 'ready_for_laboratory'
  | 'completed'
  | 'left';

export type QueueRow = {
  id: string;
  patientId: string;
  arrivalTime: string;
  fullName: string;
  diseaseType: string;
  referredDoctorUserId?: string;
  referredDoctorName?: string;
  createdAt?: string;
  /** To'lov kutilmoqda → shifokorga tayyor */
  status?: QueuePaymentStatus;
};

export const QUEUE_PER_PAGE = 15;

export function normalizeQueueRow(row: QueueRow): QueueRow {
  return {
    ...row,
    status: row.status ?? 'waiting_payment',
  };
}

export function isWaitingPayment(row: QueueRow): boolean {
  const status = row.status ?? 'waiting_payment';
  return status === 'waiting_payment';
}

export function isWaitingPostPayment(row: QueueRow): boolean {
  const status = row.status ?? 'waiting_payment';
  return status === 'waiting_post_payment';
}

export function isReadyForLaboratory(row: QueueRow): boolean {
  const status = row.status ?? 'waiting_payment';
  return status === 'ready_for_laboratory';
}

/** Shifokor navbatida ko'rinadigan holatlar (to'lov qilingan, qabul kutilmoqda) */
export function isVisibleToDoctor(row: QueueRow): boolean {
  const status = row.status ?? 'waiting_payment';
  return status === 'ready_for_doctor' || status === 'with_doctor';
}

/** Kassa to'lov navbatida ko'rinadigan holatlar */
export function isVisibleToKassaPayment(row: QueueRow): boolean {
  const status = row.status ?? 'waiting_payment';
  return status === 'waiting_payment' || status === 'waiting_post_payment';
}

export type QueuePaymentStatusMeta = {
  label: string;
  badgeClassName: string;
};

export function getQueuePaymentStatusMeta(
  status?: QueuePaymentStatus,
): QueuePaymentStatusMeta {
  switch (status ?? 'waiting_payment') {
    case 'waiting_payment':
      return {
        label: "To'lanmagan",
        badgeClassName: 'bg-amber-100 text-amber-800 ring-amber-200',
      };
    case 'ready_for_doctor':
      return {
        label: "To'langan",
        badgeClassName: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
      };
    case 'with_doctor':
      return {
        label: 'Shifokorda',
        badgeClassName: 'bg-sky-100 text-sky-800 ring-sky-200',
      };
    case 'waiting_post_payment':
      return {
        label: "Qo'shimcha to'lov",
        badgeClassName: 'bg-orange-100 text-orange-800 ring-orange-200',
      };
    case 'ready_for_laboratory':
      return {
        label: 'Laboratoriyaga',
        badgeClassName: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
      };
    case 'completed':
      return {
        label: 'Yakunlangan',
        badgeClassName: 'bg-slate-100 text-slate-700 ring-slate-200',
      };
    case 'left':
      return {
        label: 'Ketdi',
        badgeClassName: 'bg-slate-100 text-slate-500 ring-slate-200',
      };
    default:
      return {
        label: "To'lanmagan",
        badgeClassName: 'bg-amber-100 text-amber-800 ring-amber-200',
      };
  }
}
