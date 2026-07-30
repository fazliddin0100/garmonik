import type { InpatientAdmission } from '@/lib/inpatient/types';
import type { QueueRow } from './types';

/** Statsionarda yoki uyda kuzatuvda — klinika navbatida ko‘rinmasligi kerak */
export function getActiveInpatientPatientIds(
  admissions: InpatientAdmission[],
): Set<string> {
  const ids = new Set<string>();
  for (const a of admissions) {
    if (a.status === 'admitted' || a.status === 'home_monitoring') {
      ids.add(a.patientId);
    }
  }
  return ids;
}

export function filterQueueExcludingInpatients(
  queueRows: QueueRow[],
  admissions: InpatientAdmission[],
): QueueRow[] {
  const excluded = getActiveInpatientPatientIds(admissions);
  if (excluded.size === 0) return queueRows;
  return queueRows.filter((row) => !excluded.has(row.patientId));
}
