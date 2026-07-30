'use client';

import { Button } from '@/components/ui/button';
import PatientStageEpicrisisPanel from '@/components/patients/PatientStageEpicrisisPanel';
import PatientSpecialistReferralPanel from '@/components/patients/PatientSpecialistReferralPanel';
import {
  ALL_EPICRISES_DOCUMENT_TITLE,
  buildAllEpicrisesDocumentInput,
  countAllEpicrisesSources,
} from '@/lib/patients/all-epicrises-document';
import {
  downloadClinicalDocumentAsWord,
  printClinicalDocument,
} from '@/lib/patients/print-clinical-document';
import type { PatientStageEpicrisisInput } from '@/lib/patients/stage-epicrisis';
import { getPatientStageEpicrisisRecords } from '@/lib/patients/stage-epicrisis';
import { getPatientSpecialistConsultations } from '@/lib/patients/specialist-consultation';
import type { PatientRow } from '@/lib/patients/types';
import type { InpatientAdmission } from '@/lib/inpatient/types';
import { formatInpatientRoomLabel } from '@/lib/inpatient/admission-lookup';
import { ClipboardList, FileDown, FileText, Hospital, Printer, Stethoscope } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type EpicrisisSubView = 'bosqichli' | 'statsionar' | 'mutaxassis';

type PatientAllEpicrisesPanelProps = {
  patient: PatientRow;
  inpatient?: InpatientAdmission | null;
  saving?: boolean;
  defaultDoctorUserId?: string | null;
  onSaveStageEpicrisis?: (input: PatientStageEpicrisisInput) => void | Promise<void>;
  onReferSpecialist?: (
    specialistId: string,
    specialistLabel: string,
    referralNote: string,
  ) => void | Promise<void>;
};

function formatIso(iso?: string): string {
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

export function StatsionarTekshiruvSection({
  patient,
  inpatient,
}: {
  patient: PatientRow;
  inpatient?: InpatientAdmission | null;
}) {
  if (!inpatient) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <Hospital className="size-5 shrink-0" />
          <h3 className="font-semibold">Statsionar tekshiruv</h3>
        </div>
        <p className="text-sm text-slate-600">
          Bemor: <span className="font-medium text-slate-900">{patient.fullName}</span>
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Hozircha statsionar yozuvi yo‘q. Bemor klinikaga yotqizilganda kunlik ko‘riklar va
          vital ko‘rsatkichlar shu yerda jamlanadi.
        </p>
      </section>
    );
  }

  const rounds = [...inpatient.dailyRounds].sort((a, b) => {
    const da = `${a.date}T${a.time || '00:00'}`;
    const db = `${b.date}T${b.time || '00:00'}`;
    return new Date(db).getTime() - new Date(da).getTime();
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-rose-200/70 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <Hospital className="size-5 shrink-0" />
          <h3 className="font-semibold">Statsionar tekshiruv</h3>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Palata</dt>
            <dd className="mt-1 text-slate-900">{formatInpatientRoomLabel(inpatient)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Yotqizilgan
            </dt>
            <dd className="mt-1 text-slate-900">{formatIso(inpatient.admittedAt)}</dd>
          </div>
          {inpatient.attendingDoctorName ?
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Davolovchi shifokor
              </dt>
              <dd className="mt-1 text-slate-900">{inpatient.attendingDoctorName}</dd>
            </div>
          : null}
          {inpatient.plannedStayUntil ?
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Rejalashtirilgan chiqish
              </dt>
              <dd className="mt-1 text-slate-900">
                {new Date(`${inpatient.plannedStayUntil}T12:00:00`).toLocaleDateString('uz-UZ')}
              </dd>
            </div>
          : null}
        </dl>
        {inpatient.admissionNote ?
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Yotqizish eslatmasi
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-800">
              {inpatient.admissionNote}
            </p>
          </div>
        : null}
        {inpatient.dischargeNote ?
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Chiqarish eslatmasi
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-sm text-slate-800">
              {inpatient.dischargeNote}
            </p>
          </div>
        : null}
        {inpatient.homeMonitoringPlan ?
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Uy kuzatuvi rejasi
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm text-slate-800">
              {inpatient.homeMonitoringPlan}
            </p>
          </div>
        : null}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h4 className="font-semibold text-slate-900">Kunlik ko‘riklar</h4>
        <p className="mt-1 text-sm text-slate-500">Jami {rounds.length} ta yozuv</p>
        {rounds.length === 0 ?
          <p className="mt-3 text-sm text-slate-500">Hali kunlik ko‘rik kiritilmagan.</p>
        : <ul className="mt-3 space-y-3">
            {rounds.map((round) => {
              const vitals = [
                round.vitals?.bp ? `QB: ${round.vitals.bp}` : null,
                round.vitals?.pulse ? `Puls: ${round.vitals.pulse}` : null,
                round.vitals?.temp ? `T: ${round.vitals.temp}` : null,
                round.vitals?.spo2 ? `SpO₂: ${round.vitals.spo2}` : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li
                  key={round.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {round.date}
                      {round.time ? ` · ${round.time}` : ''}
                    </p>
                    {round.recordedByName ?
                      <span className="text-xs text-slate-500">{round.recordedByName}</span>
                    : null}
                  </div>
                  {vitals ?
                    <p className="mt-1 text-xs text-slate-600">{vitals}</p>
                  : null}
                  {round.note ?
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{round.note}</p>
                  : null}
                </li>
              );
            })}
          </ul>
        }
      </section>
    </div>
  );
}

export default function PatientAllEpicrisesPanel({
  patient,
  inpatient = null,
  saving = false,
  defaultDoctorUserId = null,
  onSaveStageEpicrisis,
  onReferSpecialist,
}: PatientAllEpicrisesPanelProps) {
  const [subView, setSubView] = useState<EpicrisisSubView>('bosqichli');
  const [printing, setPrinting] = useState(false);

  const counts = useMemo(
    () => countAllEpicrisesSources({ patient, inpatient }),
    [patient, inpatient],
  );

  const stageCount = getPatientStageEpicrisisRecords(patient).length;
  const specialistCount = getPatientSpecialistConsultations(patient).filter((c) =>
    c.consultationText.trim(),
  ).length;

  const subTabs: {
    id: EpicrisisSubView;
    label: string;
    icon: typeof FileText;
    badge?: number;
  }[] = [
    { id: 'bosqichli', label: 'Bosqichli epikriz', icon: FileText, badge: stageCount || undefined },
    {
      id: 'statsionar',
      label: 'Statsionar tekshiruv',
      icon: Hospital,
      badge: inpatient?.dailyRounds?.length || undefined,
    },
    {
      id: 'mutaxassis',
      label: 'Tor mutaxassis natijalari',
      icon: Stethoscope,
      badge: specialistCount || undefined,
    },
  ];

  async function handlePrint() {
    setPrinting(true);
    try {
      await printClinicalDocument(buildAllEpicrisesDocumentInput({ patient, inpatient }));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Chop etishda xatolik yuz berdi');
    } finally {
      setPrinting(false);
    }
  }

  async function handleWord() {
    setPrinting(true);
    try {
      await downloadClinicalDocumentAsWord(buildAllEpicrisesDocumentInput({ patient, inpatient }));
      toast.success('Kasallik tarixi Word fayli yuklab olindi');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Word yuklashda xatolik yuz berdi');
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-slate-900">
              <ClipboardList className="size-5 shrink-0 text-emerald-700" />
              <h3 className="font-semibold">Barcha epikrizlar</h3>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Bosqichli epikriz, statsionar tekshiruv va tor mutaxassis natijalari bitta shablonda.
              Bemorni uyiga kuzatishda berib yuborish uchun kasallik tarixi qog‘ozini tayyorlang.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Jami {counts.total} ta bo‘lim · bosqichli {counts.stage} · statsionar{' '}
              {counts.inpatient} · mutaxassis {counts.specialist}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
              disabled={printing || counts.total === 0}
              onClick={() => void handlePrint()}>
              <Printer className="mr-1.5 size-4" />
              Kasallik tarixini chop etish
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl border-sky-200 text-sky-800"
              disabled={printing || counts.total === 0}
              onClick={() => void handleWord()}>
              <FileDown className="mr-1.5 size-4" />
              Word
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-emerald-900/80">{ALL_EPICRISES_DOCUMENT_TITLE}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        {subTabs.map((tab) => {
          const selected = subView === tab.id;
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant={selected ? 'default' : 'outline'}
              className={
                selected ?
                  'h-auto min-h-8 max-w-full whitespace-normal rounded-xl bg-emerald-700 px-3 py-1.5 text-left text-xs leading-snug hover:bg-emerald-800'
                : 'h-auto min-h-8 max-w-full whitespace-normal rounded-xl border-slate-200 px-3 py-1.5 text-left text-xs leading-snug text-slate-700'
              }
              onClick={() => setSubView(tab.id)}>
              <Icon className="mr-1.5 size-3.5 shrink-0" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 ?
                <span
                  className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    selected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                  {tab.badge}
                </span>
              : null}
            </Button>
          );
        })}
      </div>

      {subView === 'bosqichli' ?
        onSaveStageEpicrisis ?
          <PatientStageEpicrisisPanel
            patient={patient}
            saving={saving}
            defaultDoctorUserId={defaultDoctorUserId}
            onSave={onSaveStageEpicrisis}
          />
        : <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Bosqichli epikrizni saqlash mavjud emas.</p>
          </section>
      : null}

      {subView === 'statsionar' ?
        <StatsionarTekshiruvSection patient={patient} inpatient={inpatient} />
      : null}

      {subView === 'mutaxassis' ?
        onReferSpecialist ?
          <PatientSpecialistReferralPanel
            patient={patient}
            saving={saving}
            onRefer={onReferSpecialist}
          />
        : <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Mutaxassis yo‘naltirish mavjud emas.</p>
          </section>
      : null}
    </div>
  );
}
