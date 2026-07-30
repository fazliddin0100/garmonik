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
  ADMISSION_EXAM_FIELD_LABELS,
  createEmptyAdmissionExamination,
  formatAdmissionExaminationSavedAt,
  formatAdmissionExaminationTitle,
  getPatientAdmissionExaminations,
  type PatientAdmissionExamination,
  type PatientAdmissionExaminationInput,
} from '@/lib/patients/admission-examination';
import type { PatientRow } from '@/lib/patients/types';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type DoctorOption = {
  id: string;
  fullName: string;
};

type PanelMode = 'compose' | 'view';

type PatientAdmissionExamPanelProps = {
  patient: PatientRow;
  saving?: boolean;
  actorName?: string;
  actorLogin?: string;
  defaultDoctorUserId?: string | null;
  onSave: (input: PatientAdmissionExaminationInput) => void | Promise<void>;
};

function FieldBlock({
  label,
  value,
  multiline = false,
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

function examToInput(exam: PatientAdmissionExamination): PatientAdmissionExaminationInput {
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
    ekg: exam.ekg,
    statusLocalis: exam.statusLocalis,
    examinationRegulation: exam.examinationRegulation,
    diagnosis: exam.diagnosis,
    note: exam.note,
  };
}

function buildNewDraft(
  doctors: DoctorOption[],
  defaultDoctorUserId: string | null,
): PatientAdmissionExaminationInput {
  const defaultDoctor = doctors.find((item) => item.id === defaultDoctorUserId);
  return createEmptyAdmissionExamination({
    receptionDoctorUserId: defaultDoctor?.id ?? '',
    receptionDoctorName: defaultDoctor?.fullName ?? '',
  });
}

export default function PatientAdmissionExamPanel({
  patient,
  saving = false,
  actorName = '',
  actorLogin = '',
  defaultDoctorUserId = null,
  onSave,
}: PatientAdmissionExamPanelProps) {
  const records = useMemo(() => getPatientAdmissionExaminations(patient), [patient]);
  const [mode, setMode] = useState<PanelMode>('compose');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [draft, setDraft] = useState<PatientAdmissionExaminationInput>(() =>
    createEmptyAdmissionExamination(),
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

  function openEditForm(record: PatientAdmissionExamination) {
    setDraft(examToInput(record));
    setEditingId(record.id);
    setMode('compose');
    setViewId(null);
  }

  function openView(record: PatientAdmissionExamination) {
    setViewId(record.id);
    setMode('view');
  }

  function updateDraft(patch: Partial<PatientAdmissionExaminationInput>) {
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
    const payload: PatientAdmissionExaminationInput = {
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
              <h3 className="font-semibold">Qabul ko&apos;rigi</h3>
            </div>
            <p className="text-sm text-slate-500">
              {formatAdmissionExaminationTitle(activeRecord)}
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
          <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.examinationDate} value={activeRecord.examinationDate} />
          <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.examinationTime} value={activeRecord.examinationTime} />
          <div className="md:col-span-2">
            <FieldBlock
              label={ADMISSION_EXAM_FIELD_LABELS.receptionDoctor}
              value={activeRecord.receptionDoctorName}
            />
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.complaints} value={activeRecord.complaints} multiline />
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.anamnesisMorbi} value={activeRecord.anamnesisMorbi} multiline />
          </div>
          <div className="md:col-span-2">
            <FieldBlock
              label={ADMISSION_EXAM_FIELD_LABELS.epidemiologicalHistory}
              value={activeRecord.epidemiologicalHistory}
              multiline
            />
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.anamnesisVitae} value={activeRecord.anamnesisVitae} multiline />
          </div>
          <div className="md:col-span-2">
            <FieldBlock
              label={ADMISSION_EXAM_FIELD_LABELS.statusPraesensObjectivus}
              value={activeRecord.statusPraesensObjectivus}
              multiline
            />
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.ekg} value={activeRecord.ekg} multiline />
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.statusLocalis} value={activeRecord.statusLocalis} multiline />
          </div>
          <div className="md:col-span-2">
            <FieldBlock
              label={ADMISSION_EXAM_FIELD_LABELS.examinationRegulation}
              value={activeRecord.examinationRegulation}
              multiline
            />
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.diagnosis} value={activeRecord.diagnosis} multiline />
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={ADMISSION_EXAM_FIELD_LABELS.note} value={activeRecord.note} multiline />
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Saqlangan: {formatAdmissionExaminationSavedAt(activeRecord.updatedAt)}
          {activeRecord.createdByName ? ` · ${activeRecord.createdByName}` : ''}
        </p>
      </section>
    );
  }

  const textFields = [
    ['complaints', ADMISSION_EXAM_FIELD_LABELS.complaints, 'Shikoyatlarni kiriting'],
    ['anamnesisMorbi', ADMISSION_EXAM_FIELD_LABELS.anamnesisMorbi, 'Anamnesis morbi'],
    ['epidemiologicalHistory', ADMISSION_EXAM_FIELD_LABELS.epidemiologicalHistory, 'Epidemiologik tarix'],
    ['anamnesisVitae', ADMISSION_EXAM_FIELD_LABELS.anamnesisVitae, 'Anamnesis vitae'],
    [
      'statusPraesensObjectivus',
      ADMISSION_EXAM_FIELD_LABELS.statusPraesensObjectivus,
      'Status praesens objectivus',
    ],
    ['ekg', ADMISSION_EXAM_FIELD_LABELS.ekg, 'EKG natijasi yoki tavsifi'],
    ['statusLocalis', ADMISSION_EXAM_FIELD_LABELS.statusLocalis, 'Status Localis'],
    [
      'examinationRegulation',
      ADMISSION_EXAM_FIELD_LABELS.examinationRegulation,
      "Tekshirish bo'yicha ma'lumot",
    ],
    ['diagnosis', ADMISSION_EXAM_FIELD_LABELS.diagnosis, 'Tashxis'],
    ['note', ADMISSION_EXAM_FIELD_LABELS.note, 'Izoh'],
  ] as const;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200/70 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="size-5 shrink-0" />
              <h3 className="font-semibold">
                {editingId ? 'Qabul ko\'rig\'ini tahrirlash' : 'Yangi qabul ko\'rigi'}
              </h3>
            </div>
            <p className="text-sm text-slate-500">
              {patient.fullName} · har kuni yoki kerak bo‘lganda yangi yozuv kiritish mumkin
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
            <Label htmlFor="admission-exam-date">{ADMISSION_EXAM_FIELD_LABELS.examinationDate}</Label>
            <Input
              id="admission-exam-date"
              type="date"
              value={draft.examinationDate}
              onChange={(e) => updateDraft({ examinationDate: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admission-exam-time">{ADMISSION_EXAM_FIELD_LABELS.examinationTime}</Label>
            <Input
              id="admission-exam-time"
              type="time"
              value={draft.examinationTime}
              onChange={(e) => updateDraft({ examinationTime: e.target.value })}
              className="rounded-xl bg-white"
            />
          </div>
          <div className="grid gap-1.5 md:col-span-2">
            <Label>{ADMISSION_EXAM_FIELD_LABELS.receptionDoctor}</Label>
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

          {textFields.map(([key, label, placeholder]) => (
            <div key={key} className="grid gap-1.5 md:col-span-2">
              <Label htmlFor={`admission-exam-${key}`}>{label}</Label>
              <Textarea
                id={`admission-exam-${key}`}
                value={draft[key]}
                onChange={(e) => updateDraft({ [key]: e.target.value })}
                rows={key === 'note' ? 3 : 4}
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
              <h4 className="font-semibold text-slate-900">Oldingi qabul ko&apos;rig&apos;ilari</h4>
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
                    <p className="font-medium text-slate-900">{formatAdmissionExaminationTitle(record)}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {record.receptionDoctorName || 'Shifokor tanlanmagan'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatAdmissionExaminationSavedAt(record.updatedAt)}
                  </span>
                </div>
                {record.diagnosis ?
                  <p className="mt-2 line-clamp-2 text-sm text-slate-700">{record.diagnosis}</p>
                : null}
              </button>
            ))}
          </div>
        </section>
      : null}
    </div>
  );
}
