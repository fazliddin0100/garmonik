'use client';

import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import type { ClinicRoom } from '@/lib/clinic-rooms/types';
import {
  normalizeInpatientAdmission,
  type InpatientAdmission,
} from '@/lib/inpatient/types';
import { syncRoomsWithAdmissions } from '@/lib/inpatient/utils';
import type { InpatientRoomPayment } from '@/lib/kassa/inpatient-room-payment';
import { filterQueueExcludingInpatients } from '@/lib/queue/inpatient-exclusion';
import type { QueueRow } from '@/lib/queue/types';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import type { PatientRow } from '@/lib/patients/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

export function useHeadNurseData() {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [admissions, setAdmissions] = useState<InpatientAdmission[]>([]);
  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [roomPayments, setRoomPayments] = useState<Record<string, InpatientRoomPayment>>({});
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actorName, setActorName] = useState('');
  const [actorLogin, setActorLogin] = useState('');

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const [patientsRaw, admissionsRaw, roomsRaw] = await Promise.all([
        fetchClinicResource<PatientRow[]>('patients'),
        fetchClinicResource<InpatientAdmission[]>('inpatient-admissions'),
        fetchClinicResource<ClinicRoom[]>('rooms'),
      ]);
      const normalizedPatients = (Array.isArray(patientsRaw) ? patientsRaw : [])
        .map(normalizePatientRow)
        .filter((x): x is PatientRow => x !== null);
      const normalizedAdmissions = (Array.isArray(admissionsRaw) ? admissionsRaw : [])
        .map(normalizeInpatientAdmission)
        .filter((x): x is InpatientAdmission => x !== null);
      const normalizedRooms = Array.isArray(roomsRaw) ? roomsRaw : [];
      setPatients(normalizedPatients);
      setAdmissions(normalizedAdmissions);
      setRooms(syncRoomsWithAdmissions(normalizedRooms, normalizedAdmissions));
    } catch {
      if (!options?.silent) toast.error('Ma’lumotlarni yuklab bo‘lmadi');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const id = setInterval(() => void reload({ silent: true }), 12_000);
    return () => clearInterval(id);
  }, [reload]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return;
        const me = (await res.json()) as { fullName?: string; login?: string };
        setActorName(typeof me.fullName === 'string' ? me.fullName : '');
        setActorLogin(typeof me.login === 'string' ? me.login : '');
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const admissionRequestPatients = useMemo(
    () => patients.filter((p) => p.inpatientAdmissionRequest),
    [patients],
  );

  const admittedPatientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of admissions) {
      if (a.status === 'admitted' || a.status === 'home_monitoring') {
        ids.add(a.patientId);
      }
    }
    return ids;
  }, [admissions]);

  const pendingPatients = useMemo(
    () =>
      admissionRequestPatients.filter((p) => {
        if (admittedPatientIds.has(p.id)) return false;
        const req = p.inpatientAdmissionRequest;
        if (!req) return false;
        if (req.roomPaymentAt) return true;
        return !!roomPayments[p.id];
      }),
    [admissionRequestPatients, roomPayments, admittedPatientIds],
  );

  const loadRoomPayments = useCallback(async (patientIds: string[]) => {
    if (patientIds.length === 0) {
      setRoomPayments({});
      return;
    }
    setPaymentsLoading(true);
    try {
      const res = await fetch(
        `/api/head-nurse/room-payments?patientIds=${encodeURIComponent(patientIds.join(','))}`,
        { credentials: 'include', cache: 'no-store' },
      );
      if (!res.ok) {
        setRoomPayments({});
        return;
      }
      const json = (await res.json()) as {
        payments?: Record<string, InpatientRoomPayment>;
      };
      setRoomPayments(json.payments ?? {});
    } catch {
      setRoomPayments({});
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoomPayments(admissionRequestPatients.map((p) => p.id));
  }, [admissionRequestPatients, loadRoomPayments]);

  const activeAdmissions = useMemo(
    () => admissions.filter((a) => a.status === 'admitted'),
    [admissions],
  );

  const monitoringAdmissions = useMemo(
    () => admissions.filter((a) => a.status === 'home_monitoring'),
    [admissions],
  );

  const persistAll = useCallback(
    async (
      nextPatients: PatientRow[],
      nextAdmissions: InpatientAdmission[],
      nextRooms: ClinicRoom[],
    ) => {
      const syncedRooms = syncRoomsWithAdmissions(nextRooms, nextAdmissions);

      const queueRaw = await fetchClinicResource<QueueRow[]>('queue').catch(
        () => [] as QueueRow[],
      );
      const queueRows = Array.isArray(queueRaw) ? queueRaw : [];
      const nextQueue = filterQueueExcludingInpatients(queueRows, nextAdmissions);
      const queueChanged = nextQueue.length !== queueRows.length;

      await Promise.all([
        saveClinicResource('patients', nextPatients),
        saveClinicResource('inpatient-admissions', nextAdmissions),
        saveClinicResource('rooms', syncedRooms),
        ...(queueChanged ? [saveClinicResource('queue', nextQueue)] : []),
      ]);
      setPatients(nextPatients);
      setAdmissions(nextAdmissions);
      setRooms(syncedRooms);
    },
    [],
  );

  return {
    loading,
    patients,
    admissions,
    rooms,
    roomPayments,
    paymentsLoading,
    pendingPatients,
    activeAdmissions,
    monitoringAdmissions,
    actorName,
    actorLogin,
    reload,
    persistAll,
    setPatients,
    setAdmissions,
    setRooms,
  };
}

export type HeadNurseData = ReturnType<typeof useHeadNurseData>;
