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
  createEmptyJointExamination,
  formatJointExaminationSavedAt,
  formatJointExaminationTitle,
  getPatientJointExaminations,
  JOINT_EXAM_FIELD_LABELS,
  JOINT_EXAM_TEXT_FIELDS,
  type PatientJointExamination,
  type PatientJointExaminationInput,
} from '@/lib/patients/joint-examination';
import type { PatientRow } from '@/lib/patients/types';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type DoctorOption = {
  id: string;
  fullName: string;
};

type PanelMode = 'compose' | 'view';

type PatientJointExamPanelProps = {
  patient: PatientRow;
  saving?: boolean;
  defaultDoctorUserId?: string | null;
  onSave: (input: PatientJointExaminationInput) => void | Promise<void>;
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

function examToInput(exam: PatientJointExamination): PatientJointExaminationInput {
  return {
    id: exam.id,
    examinationDate: exam.examinationDate,
    examinationTime: exam.examinationTime,
    receptionDoctorUserId: exam.receptionDoctorUserId,
    receptionDoctorName: exam.receptionDoctorName,
    complaints: exam.complaints,
    anamnesisMorbi: exam.anamnesisMorbi,
    epidemiologicalHistory: exam.epidemiologicalHistory,
    anamnesisVitae: exam.anamnesisVitae,
    statusPraesensObjectivus: exam.statusPraesensObjectivus,
    neuroStatus: exam.neuroStatus,
    statusLocalis: exam.statusLocalis,
    labAndInstrumentalDiagnostics: exam.labAndInstrumentalDiagnostics,
    conductedTherapy: exam.conductedTherapy,
    primaryDiagnosis: exam.primaryDiagnosis,
    comorbidDiagnosis: exam.comorbidDiagnosis,
    complication: exam.complication,
    backgroundDiagnosis: exam.backgroundDiagnosis,
    recommendation: exam.recommendation,
  };
}

function buildNewDraft(
  doctors: DoctorOption[],
  defaultDoctorUserId: string | null,
): PatientJointExaminationInput {
  const defaultDoctor = doctors.find((item) => item.id === defaultDoctorUserId);
  return createEmptyJointExamination({
    receptionDoctorUserId: defaultDoctor?.id ?? '',
    receptionDoctorName: defaultDoctor?.fullName ?? '',
  });
}

export default function PatientJointExamPanel({
  patient,
  saving = false,
  defaultDoctorUserId = null,
  onSave,
}: PatientJointExamPanelProps) {
  const records = useMemo(() => getPatientJointExaminations(patient), [patient]);
  const [mode, setMode] = useState<PanelMode>('compose');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [draft, setDraft] = useState<PatientJointExaminationInput>(() =>
    createEmptyJointExamination(),
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
    setDraft(buildNewDraft(doctors, defaultDoctorUserId));
    setMode('compose');
    setViewId(null);
  }

  function openEditForm(record: PatientJointExamination) {
    setDraft(examToInput(record));
    setEditingId(record.id);
    setMode('compose');
    setViewId(null);
  }

  function openView(record: PatientJointExamination) {
    setViewId(record.id);
    setMode('view');
  }

  function updateDraft(patch: Partial<PatientJointExaminationInput>) {
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
    const payload: PatientJointExaminationInput = {
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
              <h3 className="font-semibold">Qo&apos;shma ko&apos;rik</h3>
            </div>
            <p className="text-sm text-slate-500">
              {formatJointExaminationTitle(activeRecord)}
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
            label={JOINT_EXAM_FIELD_LABELS.examinationDate}
            value={activeRecord.examinationDate}
            multiline={false}
          />
          <FieldBlock
            label={JOINT_EXAM_FIELD_LABELS.examinationTime}
            value={activeRecord.examinationTime}
            multiline={false}
          />
          <div className="md:col-span-2">
            <FieldBlock
              label={JOINT_EXAM_FIELD_LABELS.receptionDoctor}
              value={activeRecord.receptionDoctorName}
              multiline={false}
            />
          </div>
          {JOINT_EXAM_TEXT_FIELDS.map(({ key, label }) => (
            <div key={key} className="md:col-span-2">
              <FieldBlock label={label} value={activeRecord[key]} />
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Saqlangan: {formatJointExaminationSavedAt(activeRecord.updatedAt)}
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
                {editingId ? "Qo'shma ko'rikni tahrirlash" : "Yangi qo'shma ko'rik"}
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              {patient.fullName} · shikoyat, anamnez, diagnostika va tashxis maydonlari
            </p>
          </div>
          {editingId ?
            <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={resetNewDraft}>
              <Plus className="mr-1.5 size-4" />
              Yangi yozuv
            </Button>
          : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="joint-exam-date">{JOINT_EXAM_FIELD_LABELS.examinationDate}</Label>
            <Input
              id="joint-exam-date"
              type="date"
              value={draft.examinationDate}
              onChange={(e) => updateDraft({ examinationDate: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="joint-exam-time">{JOINT_EXAM_FIELD_LABELS.examinationTime}</Label>
            <Input
              id="joint-exam-time"
              type="time"
              value={draft.examinationTime}
              onChange={(e) => updateDraft({ examinationTime: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>{JOINT_EXAM_FIELD_LABELS.receptionDoctor}</Label>
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

          {JOINT_EXAM_TEXT_FIELDS.map(({ key, label, placeholder, rows = 4 }) => (
            <div key={key} className="grid gap-1.5 md:col-span-2">
              <Label htmlFor={`joint-exam-${key}`}>{label}</Label>
              <Textarea
                id={`joint-exam-${key}`}
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
              <h4 className="font-semibold text-slate-900">Oldingi qo&apos;shma ko&apos;riklar</h4>
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
                    <p className="font-medium text-slate-900">{formatJointExaminationTitle(record)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {record.receptionDoctorName || 'Shifokor tanlanmagan'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatJointExaminationSavedAt(record.updatedAt)}
                  </span>
                </div>
                {record.primaryDiagnosis ?
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">{record.primaryDiagnosis}</p>
                : record.complaints ?
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">{record.complaints}</p>
                : null}
              </button>
            ))}
          </div>
        </section>
      : null}
    </div>
  );
}
