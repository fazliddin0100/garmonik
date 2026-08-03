'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LaboratoryResultEntry } from '@/lib/patients/laboratory-results';
import { resultByOrderKey } from '@/lib/patients/laboratory-results';
import { resolveLabOrders, type ResolvedLabOrder } from '@/lib/patients/resolve-order-labels';
import type { PatientRow } from '@/lib/patients/types';
import type { InpatientAdmission } from '@/lib/inpatient/types';
import { formatInpatientRoomLabel } from '@/lib/inpatient/admission-lookup';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import PatientPrescriptionDialog from '@/components/patients/PatientPrescriptionDialog';
import ClinicalMonitoringForm from '@/components/patients/ClinicalMonitoringForm';
import PatientClinicalHistoryPanel from '@/components/patients/PatientClinicalHistoryPanel';
import type { ClinicalHistoryEntry } from '@/lib/patients/clinical-history';
import {
  getPatientClinicalHistory,
  historyEntriesForKind,
} from '@/lib/patients/clinical-history';
import type { PatientPrescription } from '@/lib/patients/prescriptions';
import { formatPrescriptionDate } from '@/lib/patients/prescriptions';
import {
  downloadClinicalDocumentAsWord,
  printClinicalDocument,
} from '@/lib/patients/print-clinical-document';
import DoctorLabConclusionForm from '@/components/patients/DoctorLabConclusionForm';
import { ArrowLeft, ClipboardList, FileDown, FlaskConical, History, Hospital, Lightbulb, Pill, Printer, Stethoscope } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import LabResultsAdvicePanel, {
  LabResultStatusBadge,
} from '@/components/patients/LabResultsAdvicePanel';
import { interpretLaboratoryResults } from '@/lib/laboratory/interpret-results';
import { buildLabConclusionDraft } from '@/lib/laboratory/lab-conclusion-draft';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import type { DoctorDetailView } from '@/components/patients/doctor-detail-views';
import {
  DoctorMedicalFormPanel,
  DoctorMedicalFormTabs,
} from '@/components/patients/DoctorMedicalFormTabs';
import { DOCTOR_MEDICAL_FORMS, type DoctorMedicalFormId } from '@/lib/patients/doctor-medical-forms';
import type { PatientAdmissionExaminationInput } from '@/lib/patients/admission-examination';
import type { PatientDutyDoctorExaminationInput } from '@/lib/patients/duty-doctor-examination';
import type { PatientPrimaryExaminationInput } from '@/lib/patients/primary-examination';
import type { PatientJointExaminationInput } from '@/lib/patients/joint-examination';
import type { PatientStageEpicrisisInput } from '@/lib/patients/stage-epicrisis';
import {
  selectedServiceResultKey,
  type SelectedServiceResultRef,
} from '@/lib/patients/selected-service-results';
import {
  compareNumericToNorm,
  compareQualitativeToNorm,
  parseNormComparison,
  parseNumericLabValue,
  resolveNormText,
  type CompareStatus,
} from '@/lib/laboratory/parse-lab-value';

export type PatientClinicalDetailProps = {
  patient: PatientRow;
  labCatalog: LabCategory[];
  priceRows: ServicePriceRow[];
  mode: 'doctor' | 'nurse' | 'laboratory';
  onBack: () => void;
  onSaveResults?: (results: LaboratoryResultEntry[]) => void | Promise<void>;
  onSavePrescription?: (prescription: PatientPrescription) => void | Promise<void>;
  onAppendClinicalHistory?: (entry: ClinicalHistoryEntry) => void | Promise<void>;
  onRequestInpatient?: (note: string) => void | Promise<void>;
  onSaveAdmissionExam?: (input: PatientAdmissionExaminationInput) => void | Promise<void>;
  onSaveDutyDoctorExam?: (input: PatientDutyDoctorExaminationInput) => void | Promise<void>;
  onSavePrimaryExam?: (input: PatientPrimaryExaminationInput) => void | Promise<void>;
  onSaveJointExam?: (input: PatientJointExaminationInput) => void | Promise<void>;
  onSaveStageEpicrisis?: (input: PatientStageEpicrisisInput) => void | Promise<void>;
  onReferSpecialist?: (
    specialistId: string,
    specialistLabel: string,
    referralNote: string,
  ) => void | Promise<void>;
  onSaveSelectedServiceResults?: (
    selected: SelectedServiceResultRef[] | undefined,
  ) => void | Promise<void>;
  onSaveLabConclusion?: (text: string) => void | Promise<void>;
  admittedInpatient?: InpatientAdmission | null;
  homeMonitoringInpatient?: InpatientAdmission | null;
  saving?: boolean;
  actorName?: string;
  actorLogin?: string;
  defaultDoctorUserId?: string | null;
};

function formatEnteredAt(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function OrderList({ orders }: { orders: ResolvedLabOrder[] }) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-slate-500">Shifokor topshirish uchun tahlil belgilamagan.</p>
    );
  }
  const byCategory = new Map<string, ResolvedLabOrder[]>();
  for (const o of orders) {
    const cat = o.categoryTitle ?? 'Boshqa';
    const list = byCategory.get(cat) ?? [];
    list.push(o);
    byCategory.set(cat, list);
  }
  return (
    <ul className="space-y-4">
      {[...byCategory.entries()].map(([cat, items]) => (
        <li key={cat}>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{cat}</p>
          <ul className="mt-2 space-y-2">
            {items.map((item) => (
              <li
                key={item.key}
                className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm shadow-sm">
                <p className="font-medium text-slate-900">{item.label}</p>
                {item.kind === 'catalog' && (item.norm || item.unit) ?
                  <p className="mt-0.5 text-xs text-slate-500">
                    Me&apos;yor: {item.norm || '—'}
                    {item.unit ? ` · ${item.unit}` : ''}
                  </p>
                : null}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function DoctorModuleTabs({
  active,
  onChange,
  adviceCount,
  orderCount,
  resultCount,
  prescriptionCount,
  historyCount,
}: {
  active: DoctorDetailView;
  onChange: (view: DoctorDetailView) => void;
  adviceCount: number;
  orderCount: number;
  resultCount: number;
  prescriptionCount: number;
  historyCount: number;
}) {
  const tabs: {
    id: DoctorDetailView;
    label: string;
    icon: typeof Stethoscope;
    badge?: number;
    hidden?: boolean;
  }[] = [
    { id: 'tavsiya', label: 'Tavsiya', icon: Lightbulb, badge: adviceCount || undefined, hidden: adviceCount === 0 },
    { id: 'tashxis', label: 'Tashxis', icon: Stethoscope, badge: orderCount || undefined },
    { id: 'tahlillar', label: 'Tahlillar', icon: FlaskConical, badge: resultCount || undefined },
    { id: 'dorilar', label: 'Dorilar', icon: Pill, badge: prescriptionCount || undefined },
    { id: 'tarix', label: 'Tarix', icon: History, badge: historyCount || undefined },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tabs
        .filter((t) => !t.hidden)
        .map((tab) => {
          const selected = active === tab.id;
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={selected ? 'default' : 'outline'}
              className={
                selected ?
                  'rounded-xl bg-violet-600 hover:bg-violet-700'
                : 'rounded-xl border-slate-200'
              }
              onClick={() => onChange(tab.id)}>
              <Icon className="mr-1.5 size-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 ?
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    selected ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-800'
                  }`}>
                  {tab.badge}
                </span>
              : null}
            </Button>
          );
        })}
    </div>
  );
}

export default function PatientClinicalDetail({
  patient,
  labCatalog,
  priceRows,
  mode,
  onBack,
  onSaveResults,
  onSavePrescription,
  onAppendClinicalHistory,
  onRequestInpatient,
  onSaveAdmissionExam,
  onSaveDutyDoctorExam,
  onSavePrimaryExam,
  onSaveJointExam,
  onSaveStageEpicrisis,
  onReferSpecialist,
  onSaveSelectedServiceResults,
  onSaveLabConclusion,
  admittedInpatient = null,
  homeMonitoringInpatient = null,
  saving = false,
  actorName = '',
  actorLogin = '',
  defaultDoctorUserId = null,
}: PatientClinicalDetailProps) {
  const canEnterResults = mode === 'nurse' || mode === 'laboratory';
  const showAdvice = mode === 'doctor' || mode === 'laboratory';
  const isDoctorView = mode === 'doctor';
  const [admitOpen, setAdmitOpen] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [admitNote, setAdmitNote] = useState('');
  const orders = useMemo(
    () => resolveLabOrders(patient.orderedLaboratoryKeys ?? [], labCatalog, priceRows),
    [patient.orderedLaboratoryKeys, labCatalog, priceRows],
  );

  const [draftValues, setDraftValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const o of orders) {
      const existing = resultByOrderKey(patient.laboratoryResults, o.key);
      init[o.key] = existing?.value ?? '';
    }
    return init;
  });

  const resultsWithValues = useMemo(() => {
    const saved = patient.laboratoryResults ?? [];
    return orders.map((o) => {
      const savedEntry = resultByOrderKey(saved, o.key);
      const draft = draftValues[o.key]?.trim() ?? '';
      const value = canEnterResults ? draft : (savedEntry?.value ?? '');
      return { order: o, entry: savedEntry, displayValue: value };
    });
  }, [orders, patient.laboratoryResults, draftValues, canEnterResults]);

  const hasAnyResult = resultsWithValues.some((r) => r.displayValue.length > 0);
  const resultCount = resultsWithValues.filter((r) => r.displayValue.length > 0).length;
  const prescriptionCount = patient.prescriptions?.length ?? 0;
  const clinicalHistory = useMemo(() => getPatientClinicalHistory(patient), [patient]);
  const historyCount = clinicalHistory.length;
  const diagnosisHistory = useMemo(
    () => historyEntriesForKind(patient, 'diagnosis'),
    [patient],
  );

  const selectedServiceResultCards = useMemo(() => {
    const refs = patient.selectedServiceResults ?? [];
    const consultations = patient.specialistConsultations ?? [];
    const cards: Array<{
      key: string;
      kind: 'lab' | 'specialist';
      title: string;
      subtitle?: string;
      body: string;
      meta?: string;
    }> = [];

    for (const ref of refs) {
      if (ref.kind === 'lab') {
        const order =
          orders.find((o) => o.key === ref.orderKey) ?? {
            key: ref.orderKey,
            label: ref.orderKey,
            categoryTitle: undefined as string | undefined,
          };
        const entry = resultByOrderKey(patient.laboratoryResults, ref.orderKey);
        const value = entry?.value?.trim() ?? '';
        if (!value) continue;
        cards.push({
          key: selectedServiceResultKey(ref),
          kind: 'lab',
          title: order.label,
          subtitle: order.categoryTitle,
          body: value,
          meta:
            entry?.enteredAt ?
              `${formatEnteredAt(entry.enteredAt)}${entry.enteredByName ? ` · ${entry.enteredByName}` : ''}`
            : undefined,
        });
        continue;
      }

      const consultation = consultations.find((c) => c.id === ref.consultationId);
      const text = consultation?.consultationText?.trim() ?? '';
      if (!consultation || !text) continue;
      const when =
        consultation.consultationDate ||
        formatEnteredAt(consultation.updatedAt || consultation.createdAt);
      cards.push({
        key: selectedServiceResultKey(ref),
        kind: 'specialist',
        title: consultation.specialistLabel || 'Mutaxassis',
        body: text,
        meta:
          when + (consultation.createdByName ? ` · ${consultation.createdByName}` : ''),
      });
    }
    return cards;
  }, [
    patient.selectedServiceResults,
    patient.laboratoryResults,
    patient.specialistConsultations,
    orders,
  ]);

  const valuesByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const o of orders) {
      const v =
        canEnterResults ?
          (draftValues[o.key]?.trim() ?? '')
        : (resultByOrderKey(patient.laboratoryResults, o.key)?.value?.trim() ?? '');
      if (v) map[o.key] = v;
    }
    return map;
  }, [orders, canEnterResults, draftValues, patient.laboratoryResults]);

  const interpretation = useMemo(
    () =>
      interpretLaboratoryResults({
        orders,
        valuesByKey,
        gender: patient.gender,
        diseaseType: patient.diseaseType,
      }),
    [orders, valuesByKey, patient.gender, patient.diseaseType],
  );

  const labConclusionDraft = useMemo(
    () => buildLabConclusionDraft(interpretation),
    [interpretation],
  );

  const hasAdvice = interpretation.items.length > 0;

  const defaultDoctorView = useMemo((): DoctorDetailView => {
    if (hasAdvice) return 'tavsiya';
    if (hasAnyResult) return 'tahlillar';
    if (prescriptionCount > 0) return 'dorilar';
    return 'tashxis';
  }, [hasAdvice, hasAnyResult, prescriptionCount]);

  const [doctorView, setDoctorView] = useState<DoctorDetailView>(defaultDoctorView);
  const [medicalFormId, setMedicalFormId] = useState<DoctorMedicalFormId | null>(null);

  function handleModuleTabChange(view: DoctorDetailView) {
    setDoctorView(view);
    setMedicalFormId(null);
  }

  function handleMedicalFormSelect(formId: DoctorMedicalFormId) {
    const form = DOCTOR_MEDICAL_FORMS.find((item) => item.id === formId);
    if (form?.moduleView) {
      setDoctorView(form.moduleView);
      setMedicalFormId(null);
      return;
    }
    setMedicalFormId(formId);
  }

  const activeDoctorView = isDoctorView ? doctorView : defaultDoctorView;

  function statusForOrder(
    order: (typeof orders)[number],
    displayValue: string,
  ): CompareStatus {
    if (!displayValue.trim() || !order.norm) return 'unknown';
    const normText = resolveNormText(order.norm, patient.gender);
    const norm = parseNormComparison(normText);
    if (norm.kind === 'qualitative') return compareQualitativeToNorm(displayValue);
    const num = parseNumericLabValue(displayValue);
    if (num === null || norm.kind === 'unknown') return 'unknown';
    return compareNumericToNorm(num, norm);
  }

  async function handleSave() {
    if (!onSaveResults) return;
    const now = new Date().toISOString();
    const next: LaboratoryResultEntry[] = [];
    for (const o of orders) {
      const value = draftValues[o.key]?.trim() ?? '';
      if (!value) continue;
      const prev = resultByOrderKey(patient.laboratoryResults, o.key);
      next.push({
        orderKey: o.key,
        value,
        enteredAt: prev?.value === value ? prev.enteredAt : now,
        enteredByName: prev?.value === value ? prev.enteredByName : actorName || undefined,
        enteredByLogin: prev?.value === value ? prev.enteredByLogin : actorLogin || undefined,
      });
    }
    await onSaveResults(next.length > 0 ? next : []);
  }

  const advicePanel =
    showAdvice && interpretation.items.length > 0 ?
      <LabResultsAdvicePanel
        summary={interpretation}
        compact={canEnterResults}
        variant={mode === 'doctor' ? 'doctor' : 'default'}
      />
    : null;

  const tashxisSection = (
    <section className="rounded-2xl border border-violet-200/60 bg-linear-to-br from-violet-50/50 to-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-violet-800">
        <Stethoscope className="size-5" />
        <h3 className="font-semibold">Tashxis va topshirish rejasi</h3>
      </div>

      <div className="space-y-4">
        {patient.diseaseType ?
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Kasallik turi
            </p>
            <p className="mt-1 text-sm text-slate-800">{patient.diseaseType}</p>
          </div>
        : null}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            So‘nggi tashxis (joriy qabul)
          </p>
          <p className="mt-1 whitespace-pre-wrap rounded-xl border border-violet-100 bg-white/90 p-3 text-sm text-slate-800">
            {patient.queueClinicalNote?.trim() || '—'}
          </p>
        </div>

        {diagnosisHistory.length > 0 ?
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Oldingi tashxislar ({diagnosisHistory.length})
            </p>
            <ul className="mt-2 space-y-2">
              {diagnosisHistory.slice(0, 5).map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-800">
                  {entry.text}
                </li>
              ))}
            </ul>
          </div>
        : null}

        {isDoctorView && onAppendClinicalHistory ?
          <ClinicalMonitoringForm
            disabled={saving}
            actorName={actorName}
            actorLogin={actorLogin}
            onAdd={onAppendClinicalHistory}
          />
        : null}

        <div>
          <div className="mb-2 flex items-center gap-2 text-slate-700">
            <ClipboardList className="size-4" />
            <p className="text-xs font-medium uppercase tracking-wide">
              Topshiriladigan tahlillar va xizmatlar
            </p>
          </div>
          <OrderList orders={orders} />
        </div>
      </div>
    </section>
  );

  const tahlillarSection = (
    <section className="rounded-2xl border border-emerald-200/60 bg-linear-to-br from-emerald-50/40 to-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-emerald-800">
        <FlaskConical className="size-5" />
        <h3 className="font-semibold">
          {canEnterResults ? 'Tahlil natijalarini kiritish' : 'Tahlil natijalari'}
        </h3>
      </div>

      {isDoctorView && !hasAnyResult ?
        <p className="text-sm text-slate-500">
          Hamshira natijalarni kiritgach, bu yerda ko‘rinadi.
        </p>
      : null}

      <div className="space-y-4">
        {resultsWithValues.map(({ order, entry, displayValue }) => (
          <div
            key={order.key}
            className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-900">{order.label}</p>
              {displayValue && showAdvice ?
                <LabResultStatusBadge status={statusForOrder(order, displayValue)} />
              : null}
            </div>
            {order.categoryTitle ?
              <p className="text-xs text-slate-500">{order.categoryTitle}</p>
            : null}

            {canEnterResults ?
              <div className="mt-2 grid gap-1.5">
                <Label htmlFor={`result-${order.key}`} className="text-xs text-slate-600">
                  Natija
                </Label>
                <Input
                  id={`result-${order.key}`}
                  value={draftValues[order.key] ?? ''}
                  onChange={(e) =>
                    setDraftValues((prev) => ({
                      ...prev,
                      [order.key]: e.target.value,
                    }))
                  }
                  placeholder="Masalan: 5.2"
                  className="rounded-lg"
                />
              </div>
            : displayValue ?
              <div className="mt-2 rounded-lg bg-emerald-50/80 px-3 py-2">
                <p className="text-sm font-semibold text-emerald-900">{displayValue}</p>
                {entry?.enteredAt ?
                  <p className="mt-1 text-xs text-slate-500">
                    {formatEnteredAt(entry.enteredAt)}
                    {entry.enteredByName ? ` · ${entry.enteredByName}` : ''}
                  </p>
                : null}
              </div>
            : (
              <p className="mt-2 text-xs text-amber-700">Natija kutilmoqda</p>
            )}
          </div>
        ))}
      </div>

      {canEnterResults && onSaveResults ?
        <Button
          type="button"
          className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
          disabled={saving || orders.length === 0}
          onClick={() => void handleSave()}>
          {saving ? 'Saqlanmoqda…' : 'Natijalarni saqlash'}
        </Button>
      : null}

      {isDoctorView && onSaveLabConclusion ?
        <div className="mt-6">
          <DoctorLabConclusionForm
            conclusion={patient.labConclusion}
            suggestedDraft={labConclusionDraft}
            saving={saving}
            disabled={!hasAnyResult}
            onSave={onSaveLabConclusion}
          />
          {!hasAnyResult ?
            <p className="mt-2 text-xs text-amber-700">
              Avval laboratoriya natijalari kiritilishi kerak — keyin xulosa yoziladi.
            </p>
          : null}
        </div>
      : null}

      {isDoctorView && selectedServiceResultCards.length > 0 ?
        <div className="mt-6 border-t border-emerald-100 pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Tanlangan tibbiy xizmat natijalari
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-emerald-200 text-emerald-800"
                onClick={() => {
                  void printClinicalDocument({
                    patientName: patient.fullName,
                    patientId: patient.id,
                    diseaseType: patient.diseaseType,
                    documentTitle: 'Tahlil natijalari',
                    labConclusion: patient.labConclusion?.text,
                    items: selectedServiceResultCards.map((card) => ({
                      kind: card.kind,
                      title: card.title,
                      subtitle: card.subtitle,
                      body: card.body,
                      meta: card.meta,
                    })),
                  }).catch((error: unknown) => {
                    toast.error(
                      error instanceof Error ?
                        error.message
                      : 'Chop etishda xatolik yuz berdi',
                    );
                  });
                }}>
                <Printer className="mr-1.5 size-4" />
                Chop etish
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl border-sky-200 text-sky-800"
                onClick={() => {
                  void downloadClinicalDocumentAsWord({
                    patientName: patient.fullName,
                    patientId: patient.id,
                    diseaseType: patient.diseaseType,
                    documentTitle: 'Tahlil natijalari',
                    labConclusion: patient.labConclusion?.text,
                    items: selectedServiceResultCards.map((card) => ({
                      kind: card.kind,
                      title: card.title,
                      subtitle: card.subtitle,
                      body: card.body,
                      meta: card.meta,
                    })),
                  })
                    .then(() => toast.success('Word fayl yuklab olindi'))
                    .catch((error: unknown) => {
                      toast.error(
                        error instanceof Error ?
                          error.message
                        : 'Word yuklashda xatolik yuz berdi',
                      );
                    });
                }}>
                <FileDown className="mr-1.5 size-4" />
                Word
              </Button>
            </div>
          </div>
          <ul className="space-y-3">
            {selectedServiceResultCards.map((card) => (
              <li
                key={card.key}
                className={
                  card.kind === 'lab' ?
                    'flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-white p-3 shadow-sm'
                  : 'flex items-start gap-2 rounded-xl border border-violet-200/80 bg-white p-3 shadow-sm'
                }>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{card.title}</p>
                  {card.subtitle ?
                    <p className="text-xs text-slate-500">{card.subtitle}</p>
                  : null}
                  <div
                    className={
                      card.kind === 'lab' ?
                        'mt-2 rounded-lg bg-emerald-50/80 px-3 py-2'
                      : 'mt-2 rounded-lg bg-violet-50/80 px-3 py-2'
                    }>
                    <p
                      className={
                        card.kind === 'lab' ?
                          'text-sm font-semibold text-emerald-900'
                        : 'whitespace-pre-wrap text-sm text-slate-800'
                      }>
                      {card.body}
                    </p>
                    {card.meta ?
                      <p className="mt-1 text-xs text-slate-500">{card.meta}</p>
                    : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    title="Chop etish"
                    onClick={() => {
                      void printClinicalDocument({
                        patientName: patient.fullName,
                        patientId: patient.id,
                        diseaseType: patient.diseaseType,
                        documentTitle: card.title,
                        items: [
                          {
                            kind: card.kind,
                            title: card.title,
                            subtitle: card.subtitle,
                            body: card.body,
                            meta: card.meta,
                          },
                        ],
                      }).catch((error: unknown) => {
                        toast.error(
                          error instanceof Error ?
                            error.message
                          : 'Chop etishda xatolik yuz berdi',
                        );
                      });
                    }}>
                    <Printer className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 rounded-lg"
                    title="Word yuklab olish"
                    onClick={() => {
                      void downloadClinicalDocumentAsWord({
                        patientName: patient.fullName,
                        patientId: patient.id,
                        diseaseType: patient.diseaseType,
                        documentTitle: card.title,
                        items: [
                          {
                            kind: card.kind,
                            title: card.title,
                            subtitle: card.subtitle,
                            body: card.body,
                            meta: card.meta,
                          },
                        ],
                      })
                        .then(() => toast.success('Word fayl yuklab olindi'))
                        .catch((error: unknown) => {
                          toast.error(
                            error instanceof Error ?
                              error.message
                            : 'Word yuklashda xatolik yuz berdi',
                          );
                        });
                    }}>
                    <FileDown className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      : null}
    </section>
  );

  const dorilarSection = (
    <section className="rounded-2xl border border-violet-200/70 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-violet-900">
          <Pill className="size-5" />
          <h3 className="font-semibold">Belgilangan dorilar</h3>
        </div>
        {onSavePrescription ?
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-violet-200 text-violet-800"
            disabled={saving}
            onClick={() => setPrescriptionOpen(true)}>
            <Pill className="mr-1.5 size-4" />
            Dori belgilash
          </Button>
        : null}
      </div>
      {prescriptionCount === 0 ?
        <p className="text-sm text-slate-500">
          Hozircha dori belgilanmagan. «Dori belgilash» tugmasi orqali dorilar ro‘yxatidan tanlang.
        </p>
      : <div className="space-y-4">
          {patient.prescriptions!.map((rx) => (
            <div key={rx.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <p className="text-xs text-slate-500">
                {formatPrescriptionDate(rx.prescribedAt)}
                {rx.prescribedByName ? ` · ${rx.prescribedByName}` : ''}
              </p>
              {rx.note ?
                <p className="mt-1 text-sm text-slate-600">{rx.note}</p>
              : null}
              <ul className="mt-2 space-y-1.5">
                {rx.items.map((item) => (
                  <li key={`${rx.id}-${item.productId}`} className="text-sm text-slate-800">
                    <span className="font-medium">{item.productName}</span>
                    {item.dosage ? ` — ${item.dosage}` : ''}
                    {item.duration ? ` · ${item.duration}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      }
    </section>
  );

  const tarixSection = (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <PatientClinicalHistoryPanel
        patient={patient}
        labCatalog={labCatalog}
        priceRows={priceRows}
      />
      {isDoctorView && onAppendClinicalHistory ?
        <div className="mt-5 border-t border-slate-100 pt-5">
          <ClinicalMonitoringForm
            disabled={saving}
            actorName={actorName}
            actorLogin={actorLogin}
            onAdd={onAppendClinicalHistory}
          />
        </div>
      : null}
    </section>
  );

  const effectiveDoctorView =
    activeDoctorView === 'tavsiya' && !hasAdvice ? 'tashxis' : activeDoctorView;

  const doctorModuleContent =
    medicalFormId ?
      <DoctorMedicalFormPanel
        formId={medicalFormId}
        patient={patient}
        labCatalog={labCatalog}
        priceRows={priceRows}
        saving={saving}
        actorName={actorName}
        actorLogin={actorLogin}
        defaultDoctorUserId={defaultDoctorUserId}
        inpatient={admittedInpatient ?? homeMonitoringInpatient}
        onSaveAdmissionExam={onSaveAdmissionExam}
        onSaveDutyDoctorExam={onSaveDutyDoctorExam}
        onSavePrimaryExam={onSavePrimaryExam}
        onSaveJointExam={onSaveJointExam}
        onSaveStageEpicrisis={onSaveStageEpicrisis}
        onReferSpecialist={onReferSpecialist}
        onSaveSelectedServiceResults={onSaveSelectedServiceResults}
      />
    : (() => {
        switch (effectiveDoctorView) {
          case 'tavsiya':
            return advicePanel;
          case 'tashxis':
            return tashxisSection;
          case 'tahlillar':
            return tahlillarSection;
          case 'dorilar':
            return dorilarSection;
          case 'tarix':
            return tarixSection;
          default:
            return tashxisSection;
        }
      })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={onBack}>
          <ArrowLeft className="mr-1 size-4" />
          Ro&apos;yxatga qaytish
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">{patient.fullName}</h2>
          <p className="text-sm text-slate-500">
            ID: <span className="font-mono">{patient.id}</span>
            {patient.diseaseType ?
              <>
                {' '}
                · {patient.diseaseType}
              </>
            : null}
          </p>
        </div>
        {mode === 'doctor' && onSavePrescription ?
          <Button
            type="button"
            variant="outline"
            className="border-violet-200 text-violet-800"
            disabled={saving}
            onClick={() => setPrescriptionOpen(true)}>
            <Pill className="mr-1.5 size-4" />
            Dori belgilash
          </Button>
        : null}
        {mode === 'doctor' && onRequestInpatient && hasAnyResult ?
          admittedInpatient ?
            <span
              className="inline-flex max-w-md flex-col rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 sm:flex-row sm:items-center sm:gap-2">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Hospital className="size-4 shrink-0" />
                Statsionarda
              </span>
              <span>
                {formatInpatientRoomLabel(admittedInpatient)}
                {admittedInpatient.plannedStayUntil ?
                  ` · chiqish: ${new Date(`${admittedInpatient.plannedStayUntil}T12:00:00`).toLocaleDateString('uz-UZ')}`
                : ''}
              </span>
            </span>
          : homeMonitoringInpatient ?
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-900">
              Uyga kuzatuvda
            </span>
          : patient.inpatientAdmissionRequest ?
            patient.inpatientAdmissionRequest.roomPaymentAt ?
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                Bosh hamshira navbatida
              </span>
            : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                Kassa to‘lovini kutmoqda
              </span>
          : <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={saving}
              onClick={() => setAdmitOpen(true)}>
              <Hospital className="mr-1.5 size-4" />
              Klinikaga yotqizish
            </Button>
        : null}
      </div>

      {isDoctorView ?
        <>
          <DoctorModuleTabs
            active={effectiveDoctorView}
            onChange={handleModuleTabChange}
            adviceCount={interpretation.items.length}
            orderCount={orders.length}
            resultCount={resultCount}
            prescriptionCount={prescriptionCount}
            historyCount={historyCount}
          />
          <DoctorMedicalFormTabs
            activeFormId={medicalFormId}
            activeModuleView={effectiveDoctorView}
            onSelect={handleMedicalFormSelect}
          />
          <div className="min-h-0">{doctorModuleContent}</div>
        </>
      : <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          {tashxisSection}
          {tahlillarSection}
        </div>
      }

      {!isDoctorView ? advicePanel : null}

      {onSavePrescription ?
        <PatientPrescriptionDialog
          open={prescriptionOpen}
          onOpenChange={setPrescriptionOpen}
          patientName={patient.fullName}
          saving={saving}
          actorName={actorName}
          actorLogin={actorLogin}
          onSave={onSavePrescription}
        />
      : null}

      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Klinikaga yotqizish</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bosh hamshira bemorning yotqizish so‘rovini qabul qilib palataga joylashtiradi.
          </p>
          <div className="grid gap-1.5 py-2">
            <Label>Shifokor eslatmasi (ixtiyoriy)</Label>
            <Textarea
              value={admitNote}
              onChange={(e) => setAdmitNote(e.target.value)}
              rows={3}
              placeholder="Yotqizish sababi, kuzatish rejasi..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAdmitOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700"
              disabled={saving}
              onClick={() => {
                void (async () => {
                  await onRequestInpatient?.(admitNote);
                  setAdmitOpen(false);
                  setAdmitNote('');
                })();
              }}>
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
