'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import { filterLabCatalog } from '@/lib/laboratory/catalog-filter';
import {
  loadLabCatalog,
  saveLabCatalog,
} from '@/lib/laboratory/catalog-storage';
import { suggestedCatalogRefs } from '@/lib/laboratory/catalog-suggestions';
import {
  catalogRef,
  findCatalogItem,
  type LabCategory,
} from '@/lib/laboratory/catalog-types';
import {
  mapApiPatientToPanelPatient,
  type ApiPatientRecord,
} from '@/lib/patients/map-api-patient';
import { formatBirthDateForDisplay } from '@/lib/patients/birth-display';
import { normalizePatientRow } from '@/lib/patients/normalize-patient-row';
import type { PatientRow } from '@/lib/patients/types';
import {
  appendClinicalHistoryMany,
  createDiagnosisHistoryEntry,
  createLabOrderHistoryEntry,
} from '@/lib/patients/clinical-history';
import {
  normalizeInpatientAdmission,
  type InpatientAdmission,
} from '@/lib/inpatient/types';
import { filterQueueExcludingInpatients } from '@/lib/queue/inpatient-exclusion';
import { suggestedLabServiceKeys } from '@/lib/queue/suggested-labs';
import { healQueueRows, getQueuePatientLocationMeta } from '@/lib/queue/patient-location';
import { QUEUE_PER_PAGE, normalizeQueueRow, type QueueRow } from '@/lib/queue/types';
import type { DoctorQueueItem } from '@/lib/queue/doctor-queue';
import type { ServiceTypeRow } from '@/lib/service-types/types';
import {
  filterLaboratoryPriceRows,
  priceRowByServiceKey,
  type ServicePriceRow,
} from '@/lib/services/pricing-data';
import {
  serviceTypeByOrderKey,
  serviceTypesToPriceRows,
  priceRowsToServiceTypeRows,
} from '@/lib/services/service-types-to-prices';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Clock3,
  ExternalLink,
  FlaskConical,
  Pencil,
  Stethoscope,
  UserRound,
  Wallet,
  Waves,
} from 'lucide-react';
import Link from 'next/link';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import LaboratoryCatalogEditor from './LaboratoryCatalogEditor';
import QueueServiceTypesPicker from './QueueServiceTypesPicker';

const normalizeStoredPatient = normalizePatientRow;

function mergeClinicalFromJson(base: PatientRow, overlay: PatientRow): PatientRow {
  return {
    ...base,
    fullName: base.fullName || overlay.fullName,
    gender: base.gender || overlay.gender,
    birthDate: base.birthDate || overlay.birthDate,
    jshshir: base.jshshir || overlay.jshshir,
    address: base.address || overlay.address,
    contact: base.contact || overlay.contact,
    diseaseType: base.diseaseType || overlay.diseaseType,
    cardNumber: base.cardNumber || overlay.cardNumber,
    age: base.age ?? overlay.age,
    queueClinicalNote: overlay.queueClinicalNote ?? base.queueClinicalNote,
    orderedLaboratoryKeys: overlay.orderedLaboratoryKeys ?? base.orderedLaboratoryKeys,
    laboratoryResults: overlay.laboratoryResults ?? base.laboratoryResults,
    previousPaidServiceKeys:
      overlay.previousPaidServiceKeys ?? base.previousPaidServiceKeys,
    referredDoctorUserId:
      overlay.referredDoctorUserId ?? base.referredDoctorUserId,
    attendingDoctorUserId:
      overlay.attendingDoctorUserId ?? base.attendingDoctorUserId,
    clinicalCompletedAt:
      overlay.clinicalCompletedAt ?? base.clinicalCompletedAt,
  };
}

type QueueLivePanelProps = {
  /** @deprecated URL o‘rniga `onOpenPatients` ishlating */
  patientsBasePath?: string;
  /** Navbatdan bemorlar bo‘limiga (state) */
  onOpenPatients?: (patientId: string, openDiagnosis?: boolean) => void;
  /** Faqat navbat ro'yxati — qator bosish, tashxis va tahlil tanlovi yo'q */
  listOnly?: boolean;
  /** Shifokor kabineti: faqat shu shifokorga yo‘naltirilgan navbat */
  assignedDoctorQueueOnly?: boolean;
};

export default function QueueLivePanel({
  patientsBasePath,
  onOpenPatients,
  listOnly = false,
  assignedDoctorQueueOnly = false,
}: QueueLivePanelProps) {
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [queueData, setQueueData] = useState<QueueRow[]>([]);
  const [inpatientAdmissions, setInpatientAdmissions] = useState<
    InpatientAdmission[]
  >([]);
  const [patientCardNoById, setPatientCardNoById] = useState<
    Record<string, string>
  >({});
  const [hydrated, setHydrated] = useState(false);
  const [assignedDoctorId, setAssignedDoctorId] = useState<string | null>(null);
  const [assignedDoctorName, setAssignedDoctorName] = useState('');
  const [doctorQueueItems, setDoctorQueueItems] = useState<DoctorQueueItem[]>([]);
  const [doctorQueueLoading, setDoctorQueueLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<PatientRow | null>(null);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [activeArrival, setActiveArrival] = useState<string>('');
  const [tashxisDraft, setTashxisDraft] = useState('');
  const [labSearch, setLabSearch] = useState('');
  const [selectedLabKeys, setSelectedLabKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [saving, setSaving] = useState(false);
  const [labCatalog, setLabCatalog] = useState<LabCategory[]>([]);
  const [catalogEditorOpen, setCatalogEditorOpen] = useState(false);
  const [priceRows, setPriceRows] = useState<ServicePriceRow[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRow[]>([]);
  const [doctorNameById, setDoctorNameById] = useState<Record<string, string>>(
    {},
  );
  const [doctors, setDoctors] = useState<{ id: string; fullName: string }[]>(
    [],
  );
  const [apiPatientsById, setApiPatientsById] = useState<
    Record<string, ApiPatientRecord>
  >({});
  const [updatingDoctorQueueId, setUpdatingDoctorQueueId] = useState<
    string | null
  >(null);

  const canChangeReferredDoctor = listOnly && !assignedDoctorQueueOnly;

  const laboratoryPriceRows = useMemo(
    () => filterLaboratoryPriceRows(priceRows),
    [priceRows],
  );

  useEffect(() => {
    if (!assignedDoctorQueueOnly) {
      setAssignedDoctorId(null);
      setAssignedDoctorName('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const me = (await res.json()) as {
          kind?: string;
          role?: string;
          id?: string;
          fullName?: string;
        };
        if (cancelled) return;
        if (
          me?.kind === 'staff' &&
          (me.role === 'doctor' || me.role === 'shifokor') &&
          typeof me.id === 'string'
        ) {
          setAssignedDoctorId(me.id);
          setAssignedDoctorName(typeof me.fullName === 'string' ? me.fullName : '');
        }
      } catch {
        if (!cancelled) {
          setAssignedDoctorId(null);
          setAssignedDoctorName('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignedDoctorQueueOnly]);

  useEffect(() => {
    if (!assignedDoctorQueueOnly) {
      setDoctorQueueItems([]);
      return;
    }

    let cancelled = false;

    async function loadDoctorQueue() {
      setDoctorQueueLoading(true);
      try {
        const res = await fetch('/api/doctor/queue', {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = (await res.json()) as { items?: DoctorQueueItem[]; error?: string };
        if (cancelled) return;
        if (res.ok && Array.isArray(json.items)) {
          setDoctorQueueItems(json.items);
        } else {
          setDoctorQueueItems([]);
        }
      } catch {
        if (!cancelled) setDoctorQueueItems([]);
      } finally {
        if (!cancelled) setDoctorQueueLoading(false);
      }
    }

    void loadDoctorQueue();
    const id = setInterval(() => void loadDoctorQueue(), 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [assignedDoctorQueueOnly]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/kabinet/doctors', {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          items?: { id: string; fullName: string }[];
        };
        if (!res.ok || cancelled) return;
        const items = Array.isArray(json.items) ? json.items : [];
        const map: Record<string, string> = {};
        const list: { id: string; fullName: string }[] = [];
        for (const d of items) {
          if (d.id && d.fullName) {
            map[d.id] = d.fullName;
            list.push({ id: d.id, fullName: d.fullName });
          }
        }
        setDoctorNameById(map);
        setDoctors(list);
      } catch {
        if (!cancelled) {
          setDoctorNameById({});
          setDoctors([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listOnly) return;
    void loadLabCatalog()
      .then((cat) => setLabCatalog(cat))
      .catch(() => {
        setLabCatalog([]);
        toast.error('Laboratoriya katalogini yuklab bo‘lmadi');
      });
  }, [listOnly]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const [patientsRes, parsedQueue, parsedPrices, parsedServiceTypes, jsonPatientsRaw, admissionsRaw] =
            await Promise.all([
            fetch('/api/patients', {
              credentials: 'include',
              cache: 'no-store',
            }).catch(() => null),
            fetchClinicResource<QueueRow[]>('queue').catch(() => []),
            listOnly ?
              Promise.resolve([] as ServicePriceRow[])
            : fetchClinicResource<ServicePriceRow[]>('service-prices').catch(
                () => [],
              ),
            listOnly ?
              Promise.resolve([] as ServiceTypeRow[])
            : fetchClinicResource<ServiceTypeRow[]>('service-types').catch(
                () => [],
              ),
            fetchClinicResource<PatientRow[]>('patients').catch(() => []),
            fetchClinicResource<InpatientAdmission[]>('inpatient-admissions').catch(
              () => [],
            ),
          ]);
          const normalizedAdmissions = (Array.isArray(admissionsRaw) ?
            admissionsRaw
          : [])
            .map(normalizeInpatientAdmission)
            .filter((x): x is InpatientAdmission => x !== null);
          const clinicalById = new Map<string, PatientRow>();
          for (const item of jsonPatientsRaw) {
            const row = normalizeStoredPatient(item);
            if (row) clinicalById.set(row.id, row);
          }
          let apiPatients: ApiPatientRecord[] = [];
          if (patientsRes?.ok) {
            const patientsJson = (await patientsRes.json()) as {
              items?: ApiPatientRecord[];
            };
            apiPatients =
              Array.isArray(patientsJson.items) ? patientsJson.items : [];
          } else {
            const parsedPatients = await fetchClinicResource<PatientRow[]>(
              'patients',
            ).catch(() => []);
            apiPatients = parsedPatients
              .map(normalizeStoredPatient)
              .filter((x): x is PatientRow => x !== null)
              .map((p) => ({
                id: p.id,
                full_name: p.fullName,
                disease_type: p.diseaseType,
                address: p.address,
                phone: p.contact,
                age: p.age ?? null,
                birth_date: p.birthDate || null,
              }));
          }
          const normalized = apiPatients.map((api) => {
            const base = mapApiPatientToPanelPatient(api);
            const overlay = clinicalById.get(api.id);
            return overlay ? mergeClinicalFromJson(base, overlay) : base;
          });
          const cardNoMap: Record<string, string> = {};
          const apiById: Record<string, ApiPatientRecord> = {};
          for (const p of apiPatients) {
            if (typeof p.id === 'string' && p.id.trim()) {
              const fallback = p.id.trim();
              const cardNo =
                typeof p.card_number === 'string' && p.card_number.trim()
                  ? p.card_number.trim()
                  : fallback;
              cardNoMap[fallback] = cardNo;
              apiById[fallback] = p;
            }
          }
          const next = [...normalized].sort((a, b) =>
            a.id.localeCompare(b.id, 'uz', { numeric: true }),
          );
          const qRows = Array.isArray(parsedQueue) ? parsedQueue : [];
          const patientIds = new Set(next.map((p) => p.id));
          const withoutOrphans = qRows.filter((q) => patientIds.has(q.patientId));
          const cleanedQueue = filterQueueExcludingInpatients(
            withoutOrphans,
            normalizedAdmissions,
          );
          const healedQueue = healQueueRows(cleanedQueue, next);
          if (healedQueue !== cleanedQueue || cleanedQueue.length !== qRows.length) {
            void saveClinicResource('queue', healedQueue);
          }
          const queueToShow = healedQueue;
          const storedTypes = Array.isArray(parsedServiceTypes) ? parsedServiceTypes : [];
          const storedPrices = Array.isArray(parsedPrices) ? parsedPrices : [];
          const fromTypes = serviceTypesToPriceRows(storedTypes);
          const byKey = new Map(
            storedPrices.map((row) => [`${row.id}-${row.code}`, row] as const),
          );
          for (const row of fromTypes) {
            byKey.set(`${row.id}-${row.code}`, row);
          }
          const prices = [...byKey.values()];
          const types =
            storedTypes.length > 0 ?
              storedTypes
            : priceRowsToServiceTypeRows(prices);
          startTransition(() => {
            if (cancelled) return;
            setPatients(next);
            setQueueData(queueToShow);
            setInpatientAdmissions(normalizedAdmissions);
            setPatientCardNoById(cardNoMap);
            setApiPatientsById(apiById);
            setPriceRows(prices);
            setServiceTypes(types);
            setHydrated(true);
          });
        } catch {
          startTransition(() => {
            if (cancelled) return;
            setPatients([]);
            setQueueData([]);
            setPatientCardNoById({});
            setApiPatientsById({});
            setPriceRows([]);
            setServiceTypes([]);
            setHydrated(true);
          });
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, [listOnly]);

  useEffect(() => {
    if (!hydrated) return;

    async function refreshQueue() {
      try {
        const [q, admissionsRaw] = await Promise.all([
          fetchClinicResource<QueueRow[]>('queue'),
          fetchClinicResource<InpatientAdmission[]>('inpatient-admissions'),
        ]);
        const admissions = (Array.isArray(admissionsRaw) ? admissionsRaw : [])
          .map(normalizeInpatientAdmission)
          .filter((x): x is InpatientAdmission => x !== null);
        if (Array.isArray(q)) {
          setQueueData(filterQueueExcludingInpatients(q, admissions));
        }
        setInpatientAdmissions(admissions);
      } catch {
        /* keyingi urinish */
      }
    }

    const id = setInterval(() => {
      void refreshQueue();
    }, 12_000);

    return () => clearInterval(id);
  }, [hydrated]);

  const visibleQueueData = useMemo(() => {
    if (assignedDoctorQueueOnly) return [];
    return filterQueueExcludingInpatients(queueData, inpatientAdmissions);
  }, [queueData, inpatientAdmissions, assignedDoctorQueueOnly]);

  const queueRows = useMemo(() => {
    if (assignedDoctorQueueOnly) {
      return doctorQueueItems.map((item) => {
        const isNew =
          typeof item.createdAt === 'string' &&
          Date.now() - new Date(item.createdAt).getTime() <= 15 * 60 * 1000;
        return {
          id: item.queueId,
          patientId: item.patientId,
          arrivalTime: item.arrivalTime,
          cardNumber: item.cardNumber,
          fullName: item.fullName,
          diseaseType: item.diseaseType,
          referredDoctorUserId: undefined,
          referredDoctorName: item.referredDoctorName || assignedDoctorName || '—',
          isNew,
          paymentMeta: {
            label: item.paymentLabel,
            badgeClassName: item.paymentBadgeClassName,
          },
        };
      });
    }

    return visibleQueueData.map((q) => {
      const normalized = normalizeQueueRow(q);
      const live = patients.find((p) => p.id === q.patientId);
      const isNew =
        typeof q.createdAt === 'string' &&
        Date.now() - new Date(q.createdAt).getTime() <= 15 * 60 * 1000;
      const referredDoctorUserId =
        q.referredDoctorUserId ?? live?.referredDoctorUserId;
      const referredDoctorName =
        q.referredDoctorName ??
        (referredDoctorUserId ?
          doctorNameById[referredDoctorUserId]
        : undefined);
      const paymentMeta = getQueuePatientLocationMeta(normalized, live);
      return {
        ...normalized,
        cardNumber: patientCardNoById[q.patientId] ?? q.patientId,
        fullName: live?.fullName ?? q.fullName,
        diseaseType: live?.diseaseType ?? q.diseaseType,
        referredDoctorUserId,
        referredDoctorName: referredDoctorName || '—',
        isNew,
        paymentMeta,
      };
    });
  }, [patients, visibleQueueData, patientCardNoById, doctorNameById, assignedDoctorQueueOnly, doctorQueueItems, assignedDoctorName]);

  const pageCount = Math.max(1, Math.ceil(queueRows.length / QUEUE_PER_PAGE));

  const paged = useMemo(() => {
    const start = (page - 1) * QUEUE_PER_PAGE;
    return queueRows.slice(start, start + QUEUE_PER_PAGE);
  }, [page, queueRows]);

  async function changeReferredDoctor(
    queueId: string,
    patientId: string,
    doctorUserId: string,
  ) {
    if (!doctorUserId.trim()) {
      toast.error('Shifokorni tanlang');
      return;
    }
    const doctorName =
      doctorNameById[doctorUserId] ||
      doctors.find((d) => d.id === doctorUserId)?.fullName ||
      '';
    const current = queueData.find((q) => q.id === queueId);
    if (current?.referredDoctorUserId === doctorUserId) return;

    const prevQueue = queueData;
    const prevPatients = patients;
    const nextQueue = queueData.map((q) =>
      q.id === queueId ?
        {
          ...q,
          referredDoctorUserId: doctorUserId,
          referredDoctorName: doctorName,
        }
      : q,
    );
    const nextPatients = patients.map((p) =>
      p.id === patientId ? { ...p, referredDoctorUserId: doctorUserId } : p,
    );

    setQueueData(nextQueue);
    setPatients(nextPatients);
    setUpdatingDoctorQueueId(queueId);

    try {
      await saveClinicResource('queue', nextQueue);
      await saveClinicResource('patients', nextPatients);

      const api = apiPatientsById[patientId];
      const panel = nextPatients.find((p) => p.id === patientId);
      const nameParts = (panel?.fullName || api?.full_name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      const lastName =
        (typeof api?.last_name === 'string' && api.last_name.trim()) ||
        nameParts[0] ||
        '—';
      const firstName =
        (typeof api?.first_name === 'string' && api.first_name.trim()) ||
        nameParts[1] ||
        nameParts[0] ||
        '—';
      const phone =
        (typeof api?.phone === 'string' && api.phone.trim()) ||
        panel?.contact?.trim() ||
        '—';

      const res = await fetch('/api/patients', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: patientId,
          firstName,
          lastName,
          fatherName:
            (typeof api?.father_name === 'string' && api.father_name.trim()) ||
            nameParts.slice(2).join(' '),
          address:
            (typeof api?.address === 'string' && api.address.trim()) ||
            panel?.address ||
            '',
          phone,
          diseaseType:
            (typeof api?.disease_type === 'string' && api.disease_type.trim()) ||
            panel?.diseaseType ||
            '',
          jshshir:
            (typeof api?.jshshir === 'string' && api.jshshir.trim()) ||
            panel?.jshshir ||
            '',
          gender:
            (typeof api?.gender === 'string' && api.gender.trim()) ||
            panel?.gender ||
            '',
          birthDate:
            (typeof api?.birth_date === 'string' && api.birth_date.trim()) ||
            panel?.birthDate ||
            undefined,
          age: api?.age ?? panel?.age,
          referredDoctorUserId: doctorUserId,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'Baza yangilanmadi');
      }
      if (api) {
        setApiPatientsById((prev) => ({
          ...prev,
          [patientId]: { ...api, referred_doctor_user_id: doctorUserId },
        }));
      }
      toast.success(`Shifokor yangilandi: ${doctorName}`);
    } catch (error) {
      setQueueData(prevQueue);
      setPatients(prevPatients);
      toast.error(
        error instanceof Error ? error.message : 'Shifokorni o‘zgartirib bo‘lmadi',
      );
    } finally {
      setUpdatingDoctorQueueId(null);
    }
  }

  async function openPatientDialog(row: (typeof queueRows)[0]) {
    const p = patients.find((x) => x.id === row.patientId) ?? null;
    if (!p) return;
    try {
      const cat = await loadLabCatalog();
      setLabCatalog(cat);
    } catch {
      setLabCatalog([]);
      toast.error('Katalogni yuklab bo‘lmadi');
    }
    setActiveQueueId(row.id);
    setActiveArrival(row.arrivalTime);
    setActivePatient(p);
    setTashxisDraft(p.queueClinicalNote ?? '');
    setLabSearch('');
    const suggestedCat = suggestedCatalogRefs(p.diseaseType, labCatalog);
    const labRows = filterLaboratoryPriceRows(priceRows);
    const suggestedPricing = suggestedLabServiceKeys(p.diseaseType, labRows);
    const prevLabKeys =
      p.previousPaidServiceKeys?.filter(
        (k) =>
          priceRowByServiceKey(k, priceRows) !== undefined ||
          serviceTypeByOrderKey(k, serviceTypes) !== undefined,
      ) ?? [];
    const saved = p.orderedLaboratoryKeys ?? [];
    if (saved.length > 0) {
      setSelectedLabKeys(
        new Set([
          ...saved,
          ...suggestedCat,
          ...suggestedPricing,
          ...prevLabKeys,
        ]),
      );
    } else {
      setSelectedLabKeys(
        new Set([...suggestedCat, ...suggestedPricing, ...prevLabKeys]),
      );
    }
    setDialogOpen(true);
  }

  function closeQueueDialog() {
    setDialogOpen(false);
  }

  async function saveQueuePatient() {
    if (!activePatient) return;
    setSaving(true);
    try {
      let attendingDoctorUserId: string | undefined;
      let doctorActorName = assignedDoctorName;
      let doctorActorLogin = '';
      try {
        const meRes = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const me = (await meRes.json()) as {
          kind?: string;
          role?: string;
          id?: string;
          fullName?: string;
          login?: string;
        };
        if (
          me?.kind === 'staff' &&
          (me.role === 'doctor' || me.role === 'shifokor') &&
          typeof me.id === 'string'
        ) {
          attendingDoctorUserId = me.id;
          if (typeof me.fullName === 'string' && me.fullName.trim()) {
            doctorActorName = me.fullName.trim();
          }
          if (typeof me.login === 'string') doctorActorLogin = me.login;
        }
      } catch {
        /* ignore */
      }

      const id = activePatient.id;
      const note = tashxisDraft.trim();
      const labKeys = [...selectedLabKeys]
        .filter((k) => {
          if (k.startsWith('cat:'))
            return findCatalogItem(labCatalog, k) !== null;
          if (priceRowByServiceKey(k, priceRows)) return true;
          return serviceTypeByOrderKey(k, serviceTypes) !== undefined;
        })
        .sort((a, b) => a.localeCompare(b, 'uz'));
      const queueRow = queueData.find((q) => q.patientId === id);
      const referredDoctorUserId =
        queueRow?.referredDoctorUserId ??
        activePatient.referredDoctorUserId ??
        attendingDoctorUserId;

      const hasClinicalWork = note.length > 0 || labKeys.length > 0;
      const actor =
        attendingDoctorUserId ?
          { name: doctorActorName, login: doctorActorLogin }
        : undefined;

      let withClinical: PatientRow = {
        ...activePatient,
        ...(note ?
          { queueClinicalNote: note }
        : { queueClinicalNote: undefined }),
        ...(labKeys.length > 0 ?
          { orderedLaboratoryKeys: labKeys }
        : { orderedLaboratoryKeys: undefined }),
        ...(referredDoctorUserId ? { referredDoctorUserId } : {}),
        ...(attendingDoctorUserId ?
          { attendingDoctorUserId }
        : {}),
        ...(hasClinicalWork && attendingDoctorUserId ?
          { clinicalCompletedAt: new Date().toISOString() }
        : activePatient.clinicalCompletedAt ?
          { clinicalCompletedAt: activePatient.clinicalCompletedAt }
        : {}),
      };

      const historyEntries = [];
      if (note) {
        historyEntries.push(createDiagnosisHistoryEntry(note, actor));
      }
      if (labKeys.length > 0) {
        historyEntries.push(createLabOrderHistoryEntry(labKeys, actor));
      }
      if (historyEntries.length > 0) {
        withClinical = appendClinicalHistoryMany(withClinical, historyEntries);
      }

      const updated: PatientRow = withClinical;
      const nextPatients = patients.some((p) => p.id === id)
        ? patients.map((p) => (p.id === id ? updated : p))
        : [...patients, updated];

      const sendToKassa = labKeys.length > 0;
      const nextQueue =
        sendToKassa ?
          queueData.some((q) => q.patientId === id) ?
            queueData.map((q) =>
              q.patientId === id ?
                { ...normalizeQueueRow(q), status: 'waiting_post_payment' as const }
              : q,
            )
          : queueData
        : queueData;

      try {
        await saveClinicResource('patients', nextPatients);
        if (sendToKassa) {
          await saveClinicResource('queue', nextQueue);
        }
      } catch {
        toast.error('Serverga saqlab bo‘lmadi.');
        return;
      }
      setPatients(nextPatients);
      setQueueData(nextQueue);
      setActivePatient(updated);

      if (sendToKassa) {
        toast.success('Buyurtma kassaga yuborildi', {
          description:
            'Kassada to‘lovdan keyin bemor laboratoriya navbatida ko‘rinadi.',
        });
        if (assignedDoctorQueueOnly) {
          setDoctorQueueItems((prev) => prev.filter((item) => item.patientId !== id));
        }
      } else {
        toast.success('Tashxis saqlandi', {
          description: 'Laboratoriya tahlilini belgilang — keyin bemor navbatdan chiqadi.',
        });
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function toggleLab(key: string, checked: boolean) {
    setSelectedLabKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  const filteredCatalog = useMemo(
    () => filterLabCatalog(labCatalog, labSearch),
    [labCatalog, labSearch],
  );

  const prevPaidLabels = useMemo(() => {
    if (!activePatient?.previousPaidServiceKeys?.length) return [];
    return activePatient.previousPaidServiceKeys.map((k) => {
      const row = priceRowByServiceKey(k, priceRows);
      if (row) return { key: k, label: `${row.groupLabel}: ${row.name}` };
      const st = serviceTypeByOrderKey(k, serviceTypes);
      if (st) return { key: k, label: `${st.group}: ${st.name}` };
      return { key: k, label: k };
    });
  }, [activePatient, priceRows, serviceTypes]);

  const suggestedCatalogRefList = useMemo(
    () =>
      activePatient ?
        suggestedCatalogRefs(activePatient.diseaseType, labCatalog)
      : [],
    [activePatient, labCatalog],
  );

  return (
    <div className="space-y-5 mt-3">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
              <Waves className="size-3.5" />
              Jonli navbat
            </div>
            <h2 className="mt-2 text-lg font-semibold text-slate-800">
              {assignedDoctorQueueOnly ? 'Sizning navbatingiz' : 'Navbat ro\'yxati'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {assignedDoctorQueueOnly ?
                assignedDoctorName ?
                  <>
                    Sizga yo‘naltirilgan va <strong>to‘lov qilgan</strong> bemorlar.
                    Faqat «To&apos;langan» holatdagilar shu yerda ko‘rinadi
                    {assignedDoctorName ? ` (${assignedDoctorName})` : ''}.
                  </>
                : 'Shifokor sessiyasi yuklanmoqda…'
              : listOnly ?
                'Bemorlarning kelish vaqti, hozirgi joylashuvi (Qabul, Kassa, Shifokor, Laboratoriya), F.I.SH va kasallik turi.'
              : <>
                  Bemorlarning kelish vaqti, F.I.SH va kasallik turi
                  bo&apos;yicha ro&apos;yxat. Qatorni bosing — bemor kartasi,
                  tashxis va tahlillar rejasi ochiladi.
                </>
              }
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => {
                if (assignedDoctorQueueOnly) {
                  void fetch('/api/doctor/queue', { credentials: 'include', cache: 'no-store' })
                    .then(async (res) => {
                      const json = (await res.json()) as { items?: DoctorQueueItem[] };
                      if (res.ok && Array.isArray(json.items)) setDoctorQueueItems(json.items);
                    })
                    .catch(() => toast.error('Navbatni yangilab bo‘lmadi'));
                  return;
                }
                void fetchClinicResource<QueueRow[]>('queue')
                  .then((q) => {
                    if (Array.isArray(q)) setQueueData(q);
                  })
                  .catch(() => toast.error('Navbatni yangilab bo‘lmadi'));
              }}>
              Yangilash
            </Button>
            <div className="rounded-2xl border border-violet-100 bg-white/90 px-4 py-3 text-right">
              <p className="text-xs text-slate-500">
                {assignedDoctorQueueOnly ? "To'langan bemorlar" : 'Jami navbat'}
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {queueRows.length}
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200/80 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Activity className="size-3.5" />
                    Karta raqami
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="size-3.5" />
                    Kelish vaqti
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="size-3.5" />
                    F.I.SH
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Stethoscope className="size-3.5" />
                    Kasallik turi
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="size-3.5" />
                    {listOnly ? 'Joylashuv' : "To'lov"}
                  </span>
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Stethoscope className="size-3.5" />
                    Yo‘naltirilgan shifokor
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctorQueueLoading && assignedDoctorQueueOnly ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    To&apos;langan bemorlar yuklanmoqda…
                  </TableCell>
                </TableRow>
              ) : null}
              {!doctorQueueLoading && paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    {assignedDoctorQueueOnly ?
                      "Hozircha to'langan bemor yo'q. Kassa to'lov qilgach shu yerda ko'rinadi."
                    : 'Navbat bo\'sh'}
                  </TableCell>
                </TableRow>
              ) : null}
              {paged.map((row) => (
                <TableRow
                  key={row.id}
                  {...(listOnly ?
                    {}
                  : {
                      role: 'button' as const,
                      tabIndex: 0,
                      onClick: () => void openPatientDialog(row),
                      onKeyDown: (e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void openPatientDialog(row);
                        }
                      },
                    })}
                  className={
                    listOnly ?
                      'border-slate-100 text-sm text-slate-700'
                    : 'cursor-pointer border-slate-100 text-sm text-slate-700 transition-colors hover:bg-violet-50/80 focus-visible:bg-violet-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400'
                  }>
                  <TableCell className="font-mono text-xs">
                    {row.cardNumber}
                  </TableCell>
                  <TableCell className="font-semibold text-violet-700">
                    {row.arrivalTime}
                  </TableCell>
                  <TableCell className="min-w-[260px] font-medium">
                    <div className="flex items-center gap-2">
                      <span>{row.fullName}</span>
                      {row.isNew ?
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          Yangi
                        </span>
                      : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    {row.diseaseType}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${row.paymentMeta.badgeClassName}`}>
                      {row.paymentMeta.label}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal font-medium text-slate-800">
                    {canChangeReferredDoctor ?
                      <NativeSelect
                        size="sm"
                        className="w-full max-w-[220px]"
                        value={row.referredDoctorUserId || ''}
                        disabled={updatingDoctorQueueId === row.id}
                        aria-label="Yo‘naltirilgan shifokor"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          void changeReferredDoctor(
                            row.id,
                            row.patientId,
                            e.target.value,
                          );
                        }}>
                        <NativeSelectOption value="">
                          Shifokor tanlang
                        </NativeSelectOption>
                        {doctors.map((d) => (
                          <NativeSelectOption key={d.id} value={d.id}>
                            {d.fullName}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    : row.referredDoctorName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Har sahifada 15 ta. Sahifa: {page}/{pageCount}
            {!hydrated ?
              <span className="text-slate-400"> · bemorlar yuklanmoqda…</span>
            : null}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}>
              <ArrowLeft className="mr-1 size-4" />
              Oldingi 15
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}>
              Keyingi 15
              <ArrowRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </section>

      {!listOnly ?
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!flex max-h-[min(90vh,720px)] w-[calc(100vw-2rem)] max-w-[min(1200px,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-5xl lg:max-w-6xl">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-10 sm:p-6 sm:pb-12">
            <DialogHeader>
              <DialogTitle className="text-lg">Bemor — navbatdan</DialogTitle>
              <DialogDescription>
                {activeQueueId ?
                  <>
                    Navbat:{' '}
                    <span className="font-mono text-slate-700">
                      {activeQueueId}
                    </span>
                    {activeArrival ?
                      <>
                        {' '}
                        · Kelish:{' '}
                        <span className="font-medium text-slate-700">
                          {activeArrival}
                        </span>
                      </>
                    : null}
                  </>
                : null}
              </DialogDescription>
            </DialogHeader>

            {activePatient ?
              <div className="mt-4 space-y-5">
                <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      F.I.SH
                    </p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {activePatient.fullName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Karta raqami
                    </p>
                    <p className="mt-0.5 font-mono text-slate-800">
                      {patientCardNoById[activePatient.id] ??
                        activePatient.cardNumber ??
                        activePatient.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Kasallik turi
                    </p>
                    <p className="mt-0.5 text-slate-800">
                      {activePatient.diseaseType || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Aloqa
                    </p>
                    <p className="mt-0.5 text-slate-800">
                      {activePatient.contact || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tug&apos;ilgan sana
                    </p>
                    <p className="mt-0.5 text-slate-800">
                      {formatBirthDateForDisplay(
                        activePatient.birthDate,
                        activePatient.age,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Yoshi
                    </p>
                    <p className="mt-0.5 text-slate-800">
                      {typeof activePatient.age === 'number' ?
                        `${activePatient.age} yosh`
                      : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Jinsi
                    </p>
                    <p className="mt-0.5 text-slate-800">
                      {activePatient.gender || '—'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Manzil
                    </p>
                    <p className="mt-0.5 text-slate-800">
                      {[
                        activePatient.address,
                        activePatient.district,
                        activePatient.region,
                        activePatient.country,
                      ]
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-violet-200/70 bg-violet-50/40 p-4">
                  <QueueServiceTypesPicker
                    rows={serviceTypes}
                    labCatalog={labCatalog}
                    selectedKeys={selectedLabKeys}
                    onToggle={toggleLab}
                  />
                </div>

                {onOpenPatients || patientsBasePath ?
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        if (onOpenPatients && activePatient) {
                          onOpenPatients(activePatient.id, true);
                          return;
                        }
                        if (patientsBasePath && activePatient) {
                          window.location.href = `${patientsBasePath}?patient=${encodeURIComponent(activePatient.id)}&tashxis=1`;
                        }
                      }}>
                      <ExternalLink className="size-3.5" />
                      Tashxis / kasallik turini bazada ochish
                    </Button>
                  </div>
                : null}

                <div className="grid gap-2">
                  <Label htmlFor="queue-tashxis">Tashxis eskizi</Label>
                  <Textarea
                    id="queue-tashxis"
                    value={tashxisDraft}
                    onChange={(e) => setTashxisDraft(e.target.value)}
                    placeholder="Klinik fikr, tekshiruv reja, yo‘naltirish…"
                    rows={3}
                    className="resize-none bg-white"
                  />
                </div>

                {prevPaidLabels.length > 0 ?
                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
                    <p className="text-sm font-semibold text-amber-950">
                      Oldingi pullik xizmatlar (namuna)
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-950/90">
                      {prevPaidLabels.map((item) => (
                        <li key={item.key}>{item.label}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-amber-900/80">
                      Laboratoriya bo‘lganlari tahlillar ro‘yxatida avtomatik
                      belgilangan; qolganlarini qo‘lda tanlang.
                    </p>
                  </div>
                : null}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <FlaskConical className="size-4 text-violet-600" />
                      <p className="text-sm font-semibold text-slate-800">
                        Laboratoriya tahlillari
                      </p>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                        {selectedLabKeys.size} ta tanlangan
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setCatalogEditorOpen(true)}
                      disabled={saving}>
                      <Pencil className="size-3.5" />
                      Katalogni tahrirlash
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Turkumni oching — ichidagi tahlillarni belgilang. Qidiruv
                    turkum yoki tahlil nomi bo‘yicha filtrlash uchun. Kasallik
                    turiga qarab ba&apos;zi pozitsiyalar tavsiya sifatida
                    belgilanadi.
                  </p>
                  <Input
                    value={labSearch}
                    onChange={(e) => setLabSearch(e.target.value)}
                    placeholder="Turkum yoki tahlil bo‘yicha qidirish…"
                    className="bg-white"
                    autoComplete="off"
                  />
                  <ScrollArea className="h-[280px] rounded-xl border border-slate-200 bg-white pr-2">
                    <div className="p-2">
                      {filteredCatalog.length === 0 ?
                        <p className="py-6 text-center text-sm text-slate-500">
                          Mos keladigan turkum topilmadi.
                        </p>
                      : <Accordion
                          type="multiple"
                          className="w-full"
                          defaultValue={filteredCatalog
                            .slice(0, 4)
                            .map((c) => c.id)}>
                          {filteredCatalog.map((cat) => {
                            const nSel = cat.items.filter((it) =>
                              selectedLabKeys.has(catalogRef(cat.id, it.id)),
                            ).length;
                            return (
                              <AccordionItem
                                key={cat.id}
                                value={cat.id}
                                className="border-slate-200/80">
                                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                                  <span className="min-w-0 flex-1 pr-2 text-left font-medium text-slate-800">
                                    {cat.title}
                                    {nSel > 0 ?
                                      <span className="ml-2 text-xs font-normal text-violet-600">
                                        ({nSel} tanlangan)
                                      </span>
                                    : null}
                                  </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-1 border-t border-slate-100 pt-2">
                                    {cat.items.map((it) => {
                                      const ref = catalogRef(cat.id, it.id);
                                      const isSuggested =
                                        suggestedCatalogRefList.includes(ref);
                                      return (
                                        <label
                                          key={ref}
                                          className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50 ${
                                            isSuggested ? 'bg-violet-50/50' : ''
                                          }`}>
                                          <Checkbox
                                            checked={selectedLabKeys.has(ref)}
                                            onCheckedChange={(v) =>
                                              toggleLab(ref, v === true)
                                            }
                                            className="mt-0.5"
                                          />
                                          <span className="min-w-0 flex-1">
                                            <span className="font-medium text-slate-800">
                                              {it.name}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-slate-500">
                                              {it.norm ?
                                                <>Me&apos;yor: {it.norm}</>
                                              : null}
                                              {it.norm && it.unit ?
                                                ' · '
                                              : null}
                                              {it.unit ?
                                                <>Birlik: {it.unit}</>
                                              : null}
                                              {it.code ?
                                                <> · Kod {it.code}</>
                                              : null}
                                              {isSuggested ?
                                                <span className="text-violet-700">
                                                  {' '}
                                                  · tavsiya
                                                </span>
                                              : null}
                                            </span>
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      }
                    </div>
                  </ScrollArea>
                </div>
              </div>
            : null}
          </div>
          <DialogFooter className="mt-auto flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200/80 bg-slate-50/95 px-4 py-4 pb-5 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={closeQueueDialog}
              disabled={saving}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              onClick={saveQueuePatient}
              disabled={saving || !activePatient}>
              {saving ?
                'Saqlanmoqda…'
              : selectedLabKeys.size > 0 ?
                'Saqlash va kassaga yuborish'
              : 'Saqlash (navbatda qoladi)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      : null}

      {!listOnly ?
        <LaboratoryCatalogEditor
          open={catalogEditorOpen}
          onOpenChange={setCatalogEditorOpen}
          catalog={labCatalog}
          onSave={(next) => {
            void (async () => {
              try {
                await saveLabCatalog(next);
                setLabCatalog(next);
                toast.success('Laboratoriya katalogi yangilandi.');
              } catch {
                toast.error('Katalogni saqlab bo‘lmadi');
              }
            })();
          }}
        />
      : null}
    </div>
  );
}
