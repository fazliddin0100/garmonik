import type { QueueRow } from './types';
import { INITIAL_PATIENTS } from '@/lib/patients/initial-data';

const BASE_TIMES = [
  '08:00',
  '08:10',
  '08:20',
  '08:30',
  '08:40',
  '08:50',
  '09:00',
  '09:10',
  '09:20',
  '09:30',
  '09:40',
  '09:50',
  '10:00',
  '10:10',
  '10:20',
];

function queueId(index: number) {
  return `Q-${String(index + 1).padStart(4, '0')}`;
}

function timeByIndex(index: number) {
  const block = Math.floor(index / BASE_TIMES.length);
  const offsetHour = Math.floor((block * 3) / 6);
  const minuteShift = (block * 5) % 60;
  const base = BASE_TIMES[index % BASE_TIMES.length];
  const [h, m] = base.split(':').map(Number);
  const hour = String((h + offsetHour) % 24).padStart(2, '0');
  const minute = String((m + minuteShift) % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

export const INITIAL_QUEUE: QueueRow[] = INITIAL_PATIENTS.map((patient, index) => ({
  id: queueId(index),
  patientId: patient.id,
  arrivalTime: timeByIndex(index),
  fullName: patient.fullName,
  diseaseType: patient.diseaseType || 'Umumiy ko‘rik',
}));
