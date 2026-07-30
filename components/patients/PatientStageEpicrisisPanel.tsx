'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createEmptyStageEpicrisis,
  formatStageEpicrisisSavedAt,
  formatStageEpicrisisTitle,
  getPatientStageEpicrisisRecords,
  stageEpicrisisDefaultsFromPrimaryExam,
  STAGE_EPICRISIS_FIELD_LABELS,
  STAGE_EPICRISIS_TEXT_FIELDS,
  type PatientStageEpicrisis,
  type PatientStageEpicrisisInput,
} from '@/lib/patients/stage-epicrisis';
import { getLatestPrimaryExamination } from '@/lib/patients/primary-examination';
import type { PatientRow } from '@/lib/patients/types';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type DoctorOption = {
  id: string;
  fullName: string;
};

type PanelMode = 'compose' | 'view';

type PatientStageEpicrisisPanelProps = {
  patient: PatientRow;
  saving?: boolean;
  defaultDoctorUserId?: string | null;
  onSave: (input: PatientStageEpicrisisInput) => void | Promise<void>;
};

function FieldBlock({
  label,
  value,
  multiline = true,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {value.trim() ?
        multiline ?
          <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-800">
            {value}
          </p>
        : <p className="text-sm text-slate-800">{value}</p>
      : <p className="text-sm text-slate-400">—</p>}
    </div>
  );
}

function recordToInput(record: PatientStageEpicrisis): PatientStageEpicrisisInput {
  return {
    id: record.id,
    examinationDate: record.examinationDate,
    examinationTime: record.examinationTime,
    receptionDoctorUserId: record.receptionDoctorUserId,
    receptionDoctorName: record.receptionDoctorName,
    primaryDiagnosis: record.primaryDiagnosis,
    comorbidDiagnosis: record.comorbidDiagnosis,
    additionalDiagnosis: record.additionalDiagnosis,
    complication: record.complication,
    complaints: record.complaints,
    anamnesisMorbi: record.anamnesisMorbi,
    epidemiologicalHistory: record.epidemiologicalHistory,
    anamnesisVitae: record.anamnesisVitae,
    statusPraesensObjectivus: record.statusPraesensObjectivus,
    neuroStatus: record.neuroStatus,
    statusLocalis: record.statusLocalis,
    labAndInstrumentalDiagnostics: record.labAndInstrumentalDiagnostics,
    conductedTherapy: record.conductedTherapy,
    recommendation: record.recommendation,
  };
}

function buildNewDraft(
  patient: PatientRow,
  doctors: DoctorOption[],
  defaultDoctorUserId: string | null,
): PatientStageEpicrisisInput {
  const defaultDoctor = doctors.find((item) => item.id === defaultDoctorUserId);
  const latestPrimaryExam = getLatestPrimaryExamination(patient);
  const fromPrimary =
    latestPrimaryExam ? stageEpicrisisDefaultsFromPrimaryExam(latestPrimaryExam) : {};

  return createEmptyStageEpicrisis({
    receptionDoctorUserId: defaultDoctor?.id ?? fromPrimary.receptionDoctorUserId ?? '',
    receptionDoctorName: defaultDoctor?.fullName ?? fromPrimary.receptionDoctorName ?? '',
    ...fromPrimary,
  });
}

function hasPrimaryExamPrefill(patient: PatientRow): boolean {
  const latest = getLatestPrimaryExamination(patient);
  if (!latest) return false;
  return Boolean(
    latest.admissionComplaints.trim() ||
      latest.anamnesisMorbi.trim() ||
      latest.epidemiologicalHistory.trim() ||
      latest.anamnesisVitae.trim() ||
      latest.statusPraesensObjectivus.trim() ||
      latest.neuroStatus.trim() ||
      latest.statusLocalis.trim(),
  );
}

export default function PatientStageEpicrisisPanel({
  patient,
  saving = false,
  defaultDoctorUserId = null,
  onSave,
}: PatientStageEpicrisisPanelProps) {
  const records = useMemo(() => getPatientStageEpicrisisRecords(patient), [patient]);
  const [mode, setMode] = useState<PanelMode>('compose');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [draft, setDraft] = useState<PatientStageEpicrisisInput>(() =>
    buildNewDraft(patient, [], defaultDoctorUserId),
  );
  const [prefilledFromPrimary, setPrefilledFromPrimary] = useState(() =>
    hasPrimaryExamPrefill(patient),
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/kabinet/doctors', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: DoctorOption[] };
        setDoctors(Array.isArray(data.items) ? data.items : []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (mode !== 'compose' || editingId || draft.receptionDoctorUserId || !defaultDoctorUserId) {
      return;
    }
    const doctor = doctors.find((item) => item.id === defaultDoctorUserId);
    if (!doctor) return;
    setDraft((prev) => ({
      ...prev,
      receptionDoctorUserId: doctor.id,
      receptionDoctorName: doctor.fullName,
    }));
  }, [mode, editingId, draft.receptionDoctorUserId, defaultDoctorUserId, doctors]);

  const activeRecord = useMemo(
    () => records.find((item) => item.id === viewId) ?? null,
    [records, viewId],
  );

  function resetNewDraft() {
    setEditingId(null);
    setDraft(buildNewDraft(patient, doctors, defaultDoctorUserId));
    setPrefilledFromPrimary(hasPrimaryExamPrefill(patient));
    setMode('compose');
    setViewId(null);
  }

  function openEditForm(record: PatientStageEpicrisis) {
    setDraft(recordToInput(record));
    setEditingId(record.id);
    setPrefilledFromPrimary(false);
    setMode('compose');
    setViewId(null);
  }

  function openView(record: PatientStageEpicrisis) {
    setViewId(record.id);
    setMode('view');
  }

  function updateDraft(patch: Partial<PatientStageEpicrisisInput>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function handleDoctorChange(doctorId: string) {
    const doctor = doctors.find((item) => item.id === doctorId);
    updateDraft({
      receptionDoctorUserId: doctorId,
      receptionDoctorName: doctor?.fullName ?? '',
    });
  }

  async function handleSubmit() {
    if (!draft.receptionDoctorUserId) return;
    const payload: PatientStageEpicrisisInput = {
      ...draft,
      ...(editingId ? { id: editingId } : {}),
    };
    await onSave(payload);

    if (editingId) {
      setViewId(editingId);
      setEditingId(null);
      setMode('view');
      return;
    }

    resetNewDraft();
  }

  if (mode === 'view' && activeRecord) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={resetNewDraft}>
            <ArrowLeft className="mr-1 size-4" />
            Yangi kiritish
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="size-5 shrink-0" />
              <h3 className="font-semibold">Bosqichli epikriz</h3>
            </div>
            <p className="text-sm text-slate-500">
              {formatStageEpicrisisTitle(activeRecord)}
              {activeRecord.receptionDoctorName ? ` · ${activeRecord.receptionDoctorName}` : ''}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={saving}
            onClick={() => openEditForm(activeRecord)}>
            Tahrirlash
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            label={STAGE_EPICRISIS_FIELD_LABELS.examinationDate}
            value={activeRecord.examinationDate}
            multiline={false}
          />
          <FieldBlock
            label={STAGE_EPICRISIS_FIELD_LABELS.examinationTime}
            value={activeRecord.examinationTime}
            multiline={false}
          />
          <div className="md:col-span-2">
            <FieldBlock
              label={STAGE_EPICRISIS_FIELD_LABELS.receptionDoctor}
              value={activeRecord.receptionDoctorName}
              multiline={false}
            />
          </div>
          {STAGE_EPICRISIS_TEXT_FIELDS.map(({ key, label }) => (
            <div key={key} className="md:col-span-2">
              <FieldBlock label={label} value={activeRecord[key]} />
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Saqlangan: {formatStageEpicrisisSavedAt(activeRecord.updatedAt)}
          {activeRecord.createdByName ? ` · ${activeRecord.createdByName}` : ''}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200/70 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="size-5 shrink-0" />
              <h3 className="font-semibold">
                {editingId ? 'Bosqichli epikrizni tahrirlash' : 'Yangi bosqichli epikriz'}
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              {patient.fullName} · tashxis, anamnez, diagnostika va tavsiya maydonlari
            </p>
          </div>
          {editingId ?
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={resetNewDraft}>
              <Plus className="mr-1.5 size-4" />
              Yangi yozuv
            </Button>
          : null}
        </div>

        {!editingId && prefilledFromPrimary ?
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900">
            Umumiy maydonlar oxirgi <strong>birlamchi tekshiruv</strong>dan avtomatik to&apos;ldirildi.
            Kerak bo&apos;lsa tahrirlashingiz mumkin.
          </div>
        : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="stage-epicrisis-date">{STAGE_EPICRISIS_FIELD_LABELS.examinationDate}</Label>
            <Input
              id="stage-epicrisis-date"
              type="date"
              value={draft.examinationDate}
              onChange={(e) => updateDraft({ examinationDate: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="stage-epicrisis-time">{STAGE_EPICRISIS_FIELD_LABELS.examinationTime}</Label>
            <Input
              id="stage-epicrisis-time"
              type="time"
              value={draft.examinationTime}
              onChange={(e) => updateDraft({ examinationTime: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>{STAGE_EPICRISIS_FIELD_LABELS.receptionDoctor}</Label>
            <Select
              value={draft.receptionDoctorUserId || undefined}
              onValueChange={handleDoctorChange}>
              <SelectTrigger className="rounded-xl bg-white">
                <SelectValue placeholder="Shifokorni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {STAGE_EPICRISIS_TEXT_FIELDS.map(({ key, label, placeholder, rows = 4 }) => (
            <div key={key} className="grid gap-1.5 md:col-span-2">
              <Label htmlFor={`stage-epicrisis-${key}`}>{label}</Label>
              <Textarea
                id={`stage-epicrisis-${key}`}
                value={draft[key]}
                onChange={(e) => updateDraft({ [key]: e.target.value })}
                rows={rows}
                placeholder={placeholder}
                className="rounded-xl bg-white text-sm"
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            className="rounded-xl bg-violet-600 hover:bg-violet-700"
            disabled={saving || !draft.receptionDoctorUserId}
            onClick={() => void handleSubmit()}>
            {saving ? 'Saqlanmoqda…' : editingId ? 'Yangilash' : 'Saqlash'}
          </Button>
          {editingId ?
            <Button type="button" variant="outline" className="rounded-xl" disabled={saving} onClick={resetNewDraft}>
              Bekor qilish
            </Button>
          : null}
        </div>
      </section>

      {records.length > 0 ?
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-900">Oldingi bosqichli epikrizlar</h4>
              <p className="text-sm text-slate-500">Jami {records.length} ta yozuv</p>
            </div>
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={resetNewDraft}>
              <Plus className="mr-1.5 size-4" />
              Yana yangi
            </Button>
          </div>
          <div className="space-y-3">
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-left transition hover:border-violet-200 hover:bg-violet-50/40"
                onClick={() => openView(record)}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">{formatStageEpicrisisTitle(record)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {record.receptionDoctorName || 'Shifokor tanlanmagan'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatStageEpicrisisSavedAt(record.updatedAt)}
                  </span>
                </div>
                {record.primaryDiagnosis ?
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">{record.primaryDiagnosis}</p>
                : null}
              </button>
            ))}
          </div>
        </section>
      : null}
    </div>
  );
}
