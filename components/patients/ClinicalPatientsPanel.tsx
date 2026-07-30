'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import PatientClinicalDetail from '@/components/patients/PatientClinicalDetail';
import { fetchClinicResource, saveClinicResource } from '@/lib/clinic-data/client';
import { healQueueRowsForPatient } from '@/lib/queue/patient-location';
import { loadLabCatalog } from '@/lib/laboratory/catalog-storage';
import {
  hasClinicalServiceByDoctor,
  isDoctorClinicalPatient,
} from '@/lib/patients/clinical-attendance';
import {
  appendClinicalHistory,
  createLabResultHistoryEntry,
  createPrescriptionHistoryEntry,
  type ClinicalHistoryEntry,
} from '@/lib/patients/clinical-history';
import type { LaboratoryResultEntry } from '@/lib/patients/laboratory-results';
import type { SelectedServiceResultRef } from '@/lib/patients/selected-service-results';
import { upsertLabConclusion } from '@/lib/patients/lab-conclusion';
import {
  findAdmittedInpatient,
  findInpatientByPatientAndStatus,
  formatInpatientRoomLabel,
} from '@/lib/inpatient/admission-lookup';
import type { InpatientAdmission } from '@/lib/inpatient/types';
import { normalizeInpatientAdmission } from '@/lib/inpatient/types';
import { hasDoctorLabAssignment, hasAllLabResultsEntered } from '@/lib/patients/laboratory-results';
import { loadMergedClinicalPatients } from '@/lib/patients/merge-clinical-patients';
import type { PatientPrescription } from '@/lib/patients/prescriptions';
import {
  upsertAdmissionExamination,
  type PatientAdmissionExaminationInput,
} from '@/lib/patients/admission-examination';
import {
  upsertDutyDoctorExamination,
  type PatientDutyDoctorExaminationInput,
} from '@/lib/patients/duty-doctor-examination';
import {
  upsertPrimaryExamination,
  type PatientPrimaryExaminationInput,
} from '@/lib/patients/primary-examination';
import {
  upsertJointExamination,
  type PatientJointExaminationInput,
} from '@/lib/patients/joint-examination';
import {
  upsertStageEpicrisis,
  type PatientStageEpicrisisInput,
} from '@/lib/patients/stage-epicrisis';
import {
  referPatientToSpecialist,
} from '@/lib/patients/specialist-consultation';
import type { PatientRow } from '@/lib/patients/types';
import { isReadyForLaboratory, normalizeQueueRow, type QueueRow } from '@/lib/queue/types';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import { ArrowLeft, ArrowRight, Search, X } from 'lucide-react';
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const PER_PAGE = 12;

export type ClinicalPatientsPanelProps = {
  mode: 'doctor' | 'nurse' | 'laboratory';
  focusPatientId?: string;
};

export default function ClinicalPatientsPanel({
  mode,
  focusPatientId,
}: ClinicalPatientsPanelProps) {
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [labCatalog, setLabCatalog] = useState<Awaited<ReturnType<typeof loadLabCatalog>>>([]);
  const [priceRows, setPriceRows] = useState<ServicePriceRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [actorName, setActorName] = useState('');
  const [actorLogin, setActorLogin] = useState('');
  const [actorDoctorId, setActorDoctorId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [labReadyPatientIds, setLabReadyPatientIds] = useState<Set<string>>(new Set());
  const [inpatientAdmissions, setInpatientAdmissions] = useState<InpatientAdmission[]>([]);
  const processedFocusRef = useRef<string | null>(null);

  const isLabQueueMode = mode === 'nurse' || mode === 'laboratory';

  const isDoctorMode = mode === 'doctor';
  const shouldPoll = isDoctorMode || isLabQueueMode;

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [mergedPatients, pricesRaw, catalog, queueRaw, admissionsRaw] = await Promise.all([
          loadMergedClinicalPatients(),
          fetchClinicResource<ServicePriceRow[]>('service-prices'),
          loadLabCatalog(),
          isLabQueueMode ?
            fetchClinicResource<QueueRow[]>('queue').catch(() => [])
          : Promise.resolve([] as QueueRow[]),
          isDoctorMode ?
            fetchClinicResource<InpatientAdmission[]>('inpatient-admissions').catch(() => [])
          : Promise.resolve([] as InpatientAdmission[]),
        ]);
        const readyIds = new Set<string>();
        if (isLabQueueMode && Array.isArray(queueRaw)) {
          for (const q of queueRaw) {
            const row = normalizeQueueRow(q);
            if (isReadyForLaboratory(row)) readyIds.add(row.patientId);
          }
        }
        if (cancelled) return;
        const normalizedAdmissions = (Array.isArray(admissionsRaw) ? admissionsRaw : [])
          .map(normalizeInpatientAdmission)
          .filter((x): x is InpatientAdmission => x !== null);
        startTransition(() => {
          setRows(mergedPatients);
          setPriceRows(Array.isArray(pricesRaw) ? pricesRaw : []);
          setLabCatalog(catalog);
          setLabReadyPatientIds(readyIds);
          setInpatientAdmissions(normalizedAdmissions);
          setLoadError(null);
          setHydrated(true);
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Bemorlar yuklanmadi';
        startTransition(() => {
          setRows([]);
          setPriceRows([]);
          setLabCatalog([]);
          setLoadError(msg);
          setHydrated(true);
        });
      }
    }

    queueMicrotask(() => {
      void loadData();
    });

    if (!shouldPoll) {
      return () => {
        cancelled = true;
      };
    }

    const id = setInterval(() => void loadData(), 12_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isLabQueueMode, shouldPoll, isDoctorMode]);

  useEffect(() => {
    if (!isDoctorMode && !isLabQueueMode) return;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          fullName?: string;
          displayName?: string;
          login?: string;
          id?: string;
          kind?: string;
          role?: string;
        };
        setActorName(
          (typeof data.fullName === 'string' && data.fullName) ||
            (typeof data.displayName === 'string' && data.displayName) ||
            '',
        );
        setActorLogin(typeof data.login === 'string' ? data.login : '');
        if (
          isDoctorMode &&
          data.kind === 'staff' &&
          (data.role === 'doctor' || data.role === 'shifokor') &&
          typeof data.id === 'string'
        ) {
          setActorDoctorId(data.id);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [isDoctorMode, isLabQueueMode]);

  const assignedRows = useMemo(() => {
    if (isDoctorMode) {
      if (!actorDoctorId) return [];
      return rows.filter((r) => isDoctorClinicalPatient(r, actorDoctorId));
    }
    const withOrders = rows.filter(hasDoctorLabAssignment);
    if (isLabQueueMode) {
      let list = withOrders.filter((r) => labReadyPatientIds.has(r.id));
      if (mode === 'laboratory') {
        list = list.filter((r) => !hasAllLabResultsEntered(r));
      }
      return list;
    }
    return withOrders;
  }, [
    rows,
    isDoctorMode,
    isLabQueueMode,
    labReadyPatientIds,
    mode,
    actorDoctorId,
  ]);

  const doctorCandidatesCount = useMemo(() => {
    if (!isDoctorMode) return 0;
    return rows.filter((r) => hasClinicalServiceByDoctor(r)).length;
  }, [rows, isDoctorMode]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assignedRows;
    return assignedRows.filter((r) =>
      [r.id, r.fullName, r.diseaseType, r.contact]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [assignedRows, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filtered.slice(start, start + PER_PAGE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const selectedPatient = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const selectedAdmitted = useMemo(
    () =>
      selectedPatient ?
        findAdmittedInpatient(inpatientAdmissions, selectedPatient.id)
      : null,
    [selectedPatient, inpatientAdmissions],
  );

  const selectedHomeMonitoring = useMemo(
    () =>
      selectedPatient ?
        findInpatientByPatientAndStatus(
          inpatientAdmissions,
          selectedPatient.id,
          'home_monitoring',
        )
      : null,
    [selectedPatient, inpatientAdmissions],
  );

  useEffect(() => {
    if (!hydrated || !focusPatientId) return;
    if (processedFocusRef.current === focusPatientId) return;
    const row = assignedRows.find((r) => r.id === focusPatientId);
    if (!row) return;
    processedFocusRef.current = focusPatientId;
    setSelectedId(focusPatientId);
  }, [hydrated, focusPatientId, assignedRows]);

  const persistPatient = useCallback(async (updated: PatientRow) => {
    const next = rows.map((r) => (r.id === updated.id ? updated : r));
    setRows(next);
    try {
      await saveClinicResource('patients', next);
    } catch {
      toast.error('Serverga saqlab bo‘lmadi');
      throw new Error('save failed');
    }
  }, [rows]);

  async function handleSaveResults(results: LaboratoryResultEntry[]) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updatedBase: PatientRow = {
        ...selectedPatient,
        laboratoryResults: results.length > 0 ? results : undefined,
      };
      const filled = results.filter((r) => r.value.trim());
      const prevSig = JSON.stringify(selectedPatient.laboratoryResults ?? []);
      const nextSig = JSON.stringify(results);
      const updated =
        filled.length > 0 && prevSig !== nextSig ?
          appendClinicalHistory(
            updatedBase,
            createLabResultHistoryEntry(filled, {
              name: actorName,
              login: actorLogin,
            }),
          )
        : updatedBase;
      await persistPatient(updated);
      if (hasAllLabResultsEntered(updated)) {
        try {
          const queueRaw = await fetchClinicResource<QueueRow[]>('queue');
          const queueRows = Array.isArray(queueRaw) ? queueRaw : [];
          const healed = healQueueRowsForPatient(queueRows, updated);
          if (healed !== queueRows) {
            await saveClinicResource('queue', healed);
          }
        } catch {
          /* navbat yangilanmasa ham natijalar saqlangan */
        }
      }
      toast.success('Natijalar saqlandi');
      if (mode === 'laboratory' && hasAllLabResultsEntered(updated)) {
        setSelectedId(null);
        toast.message('Bemor laboratoriya ro‘yxatidan olib tashlandi');
      }
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrescription(prescription: PatientPrescription) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updatedBase: PatientRow = {
        ...selectedPatient,
        prescriptions: [prescription, ...(selectedPatient.prescriptions ?? [])],
      };
      const updated = appendClinicalHistory(
        updatedBase,
        createPrescriptionHistoryEntry(prescription),
      );
      await persistPatient(updated);
      toast.success('Dori retsepti saqlandi');
    } catch {
      /* toast */
    } finally {
      setSaving(false);
    }
  }

  async function handleAppendClinicalHistory(entry: ClinicalHistoryEntry) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = appendClinicalHistory(selectedPatient, entry);
      const next: PatientRow =
        entry.kind === 'diagnosis' && entry.text ?
          { ...updated, queueClinicalNote: entry.text }
        : updated;
      await persistPatient(next);
      toast.success('Bemor kartasiga saqlandi');
    } catch {
      /* toast */
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDutyDoctorExam(input: PatientDutyDoctorExaminationInput) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = upsertDutyDoctorExamination(selectedPatient, input, {
        name: actorName,
        login: actorLogin,
      });
      await persistPatient(updated);
      toast.success(
        input.id ?
          'Navbatchi shifokor ko‘rigi yangilandi'
        : 'Navbatchi shifokor ko‘rigi saqlandi. Yana yangi yozuv kiritishingiz mumkin',
      );
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAdmissionExam(input: PatientAdmissionExaminationInput) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = upsertAdmissionExamination(selectedPatient, input, {
        name: actorName,
        login: actorLogin,
      });
      await persistPatient(updated);
      toast.success(
        input.id ?
          'Qabul ko‘rigi yangilandi'
        : 'Qabul ko‘rigi saqlandi. Yana yangi yozuv kiritishingiz mumkin',
      );
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrimaryExam(input: PatientPrimaryExaminationInput) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = upsertPrimaryExamination(selectedPatient, input, {
        name: actorName,
        login: actorLogin,
      });
      await persistPatient(updated);
      toast.success(
        input.id ?
          'Birlamchi tekshiruv yangilandi'
        : 'Birlamchi tekshiruv saqlandi. Yana yangi yozuv kiritishingiz mumkin',
      );
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveJointExam(input: PatientJointExaminationInput) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = upsertJointExamination(selectedPatient, input, {
        name: actorName,
        login: actorLogin,
      });
      await persistPatient(updated);
      toast.success(
        input.id ?
          "Qo'shma ko'rik yangilandi"
        : "Qo'shma ko'rik saqlandi. Yana yangi yozuv kiritishingiz mumkin",
      );
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveStageEpicrisis(input: PatientStageEpicrisisInput) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = upsertStageEpicrisis(selectedPatient, input, {
        name: actorName,
        login: actorLogin,
      });
      await persistPatient(updated);
      toast.success(
        input.id ?
          'Bosqichli epikriz yangilandi'
        : 'Bosqichli epikriz saqlandi. Yana yangi yozuv kiritishingiz mumkin',
      );
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleReferSpecialist(
    specialistId: string,
    specialistLabel: string,
    referralNote: string,
  ) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = referPatientToSpecialist(
        selectedPatient,
        specialistId,
        specialistLabel,
        { id: actorDoctorId ?? undefined, name: actorName },
        referralNote,
      );
      await persistPatient(updated);
      toast.success(`${specialistLabel}ga yo'naltirildi`);
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSelectedServiceResults(
    selected: SelectedServiceResultRef[] | undefined,
  ) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated: PatientRow = {
        ...selectedPatient,
        selectedServiceResults: selected,
      };
      await persistPatient(updated);
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLabConclusion(text: string) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated = upsertLabConclusion(selectedPatient, text, {
        name: actorName,
        login: actorLogin,
      });
      await persistPatient(updated);
      toast.success('Laboratoriya xulosasi saqlandi');
    } catch {
      /* toast already */
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestInpatient(note: string) {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      const updated: PatientRow = {
        ...selectedPatient,
        inpatientAdmissionRequest: {
          requestedAt: new Date().toISOString(),
          requestedByName: actorName || undefined,
          requestedByLogin: actorLogin || undefined,
          note: note.trim() || undefined,
        },
      };
      await persistPatient(updated);
      toast.success('Kassa to‘lov navbatiga yuborildi. Xona to‘lovi qilingandan keyin bosh hamshira joylashtiradi');
    } catch {
      /* toast */
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated) {
    return <p className="text-sm text-slate-500">Yuklanmoqda…</p>;
  }

  if (selectedPatient) {
    return (
      <PatientClinicalDetail
        key={selectedPatient.id}
        patient={selectedPatient}
        labCatalog={labCatalog}
        priceRows={priceRows}
        mode={mode}
        onBack={() => setSelectedId(null)}
        onSaveResults={isLabQueueMode ? handleSaveResults : undefined}
        onSavePrescription={mode === 'doctor' ? handleSavePrescription : undefined}
        onAppendClinicalHistory={mode === 'doctor' ? handleAppendClinicalHistory : undefined}
        onSaveAdmissionExam={mode === 'doctor' ? handleSaveAdmissionExam : undefined}
        onSaveDutyDoctorExam={mode === 'doctor' ? handleSaveDutyDoctorExam : undefined}
        onSavePrimaryExam={mode === 'doctor' ? handleSavePrimaryExam : undefined}
        onSaveJointExam={mode === 'doctor' ? handleSaveJointExam : undefined}
        onSaveStageEpicrisis={mode === 'doctor' ? handleSaveStageEpicrisis : undefined}
        onReferSpecialist={mode === 'doctor' ? handleReferSpecialist : undefined}
        onSaveSelectedServiceResults={
          mode === 'doctor' ? handleSaveSelectedServiceResults : undefined
        }
        onSaveLabConclusion={mode === 'doctor' ? handleSaveLabConclusion : undefined}
        onRequestInpatient={mode === 'doctor' ? handleRequestInpatient : undefined}
        defaultDoctorUserId={actorDoctorId}
        admittedInpatient={selectedAdmitted}
        homeMonitoringInpatient={selectedHomeMonitoring}
        saving={saving}
        actorName={actorName}
        actorLogin={actorLogin}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur">
      <div className="mb-4 space-y-3">
        <p className="text-sm text-slate-600">
          {mode === 'doctor' ?
            'Siz qabul qilgan bemorlar — tashxis, tahlil buyurtmalari va natijalar modullar orqali.'
          : mode === 'laboratory' ?
            'Shifokor buyurtmasi va kassa to‘lovi qilingan bemorlar. Natijalar kiritilgach bemor ro‘yxatdan chiqadi.'
          : 'Topshiriladigan tahlillar bo‘yicha natijalarni kiriting.'}
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="clinical-patient-search">Qidiruv</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="clinical-patient-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="F.I.SH, ID, kasallik turi…"
              className="bg-white pl-9 pr-10"
            />
            {searchQuery ?
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
                aria-label="Tozalash">
                <X className="size-4" />
              </Button>
            : null}
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Jami: <span className="font-medium text-slate-800">{assignedRows.length}</span> ta bemor
          {mode === 'doctor' ?
            ' (siz qabul qilgan)'
          : ' (tahlil buyurtmasi bilan)'}
        </p>
        {loadError ?
          <p className="text-sm text-rose-600">Yuklash xatosi: {loadError}</p>
        : null}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="w-10">#</TableHead>
              <TableHead>F.I.SH</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Kasallik turi</TableHead>
              <TableHead className="text-center">Tahlillar</TableHead>
              <TableHead className="text-center">Natijalar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ?
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-slate-500">
                  {assignedRows.length === 0 ?
                    (loadError ?
                      'Bemorlar bazasini yuklab bo‘lmadi. Sahifani yangilab ko‘ring.'
                    : mode === 'laboratory' ?
                      'Hozircha laboratoriyaga kelgan bemor yo‘q. Shifokor tahlil belgilab, kassada to‘lov qilingandan keyin bemor shu yerda ko‘rinadi.'
                    : mode === 'doctor' ?
                      (rows.length === 0 ?
                        'Hozircha klinikada ro‘yxatdan o‘tgan bemor yo‘q. Avval qabulxona bemor qabul qiladi.'
                      : doctorCandidatesCount > 0 ?
                        'Sizning qabul qilgan bemorlaringiz topilmadi. «Navbat» bo‘limida bemor tanlab, tashxis va tahlillarni saqlang.'
                      : 'Hozircha siz qabul qilgan bemor yo‘q. «Navbat» bo‘limiga o‘ting, bemor tanlang va tashxis/tahlillarni belgilab saqlang.')
                    : 'Hali shifokor tahlil belgilamagan bemor yo‘q. Navbatdan bemor qabul qiling va tahlillarni tanlang.')
                  : 'Qidiruv bo‘yicha topilmadi.'}
                </TableCell>
              </TableRow>
            : paged.map((row, index) => {
                const orderCount = row.orderedLaboratoryKeys?.length ?? 0;
                const resultCount = row.laboratoryResults?.filter((r) => r.value.trim()).length ?? 0;
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-violet-50/60"
                    onClick={() => setSelectedId(row.id)}>
                    <TableCell className="text-slate-500">
                      {(page - 1) * PER_PAGE + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{row.fullName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.id}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal text-slate-600">
                      {row.diseaseType || '—'}
                    </TableCell>
                    <TableCell className="text-center text-violet-700">{orderCount}</TableCell>
                    <TableCell className="text-center">
                      {resultCount > 0 ?
                        <span className="text-emerald-700">{resultCount}</span>
                      : <span className="text-slate-400">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })
            }
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Sahifa {page}/{pageCount}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ArrowLeft className="mr-1 size-4" />
            Oldingi
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
            Keyingi
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
