'use client';

import { Button } from '@/components/ui/button';
import type { DoctorDetailView } from '@/components/patients/doctor-detail-views';
import {
  DOCTOR_MEDICAL_FORMS,
  findDoctorMedicalForm,
  type DoctorMedicalFormId,
} from '@/lib/patients/doctor-medical-forms';
import type { PatientRow } from '@/lib/patients/types';
import type { PatientAdmissionExaminationInput } from '@/lib/patients/admission-examination';
import type { PatientDutyDoctorExaminationInput } from '@/lib/patients/duty-doctor-examination';
import type { PatientPrimaryExaminationInput } from '@/lib/patients/primary-examination';
import type { PatientJointExaminationInput } from '@/lib/patients/joint-examination';
import type { PatientStageEpicrisisInput } from '@/lib/patients/stage-epicrisis';
import PatientAdmissionExamPanel from '@/components/patients/PatientAdmissionExamPanel';
import PatientDutyDoctorExamPanel from '@/components/patients/PatientDutyDoctorExamPanel';
import PatientPrimaryExamPanel from '@/components/patients/PatientPrimaryExamPanel';
import PatientJointExamPanel from '@/components/patients/PatientJointExamPanel';
import PatientStageEpicrisisPanel from '@/components/patients/PatientStageEpicrisisPanel';
import PatientSpecialistReferralPanel from '@/components/patients/PatientSpecialistReferralPanel';
import PatientAllEpicrisesPanel, {
  StatsionarTekshiruvSection,
} from '@/components/patients/PatientAllEpicrisesPanel';
import PatientServiceResultsPanel from '@/components/patients/PatientServiceResultsPanel';
import type { LabCategory } from '@/lib/laboratory/catalog-types';
import type { SelectedServiceResultRef } from '@/lib/patients/selected-service-results';
import type { ServicePriceRow } from '@/lib/services/pricing-data';
import type { InpatientAdmission } from '@/lib/inpatient/types';
import { FileText } from 'lucide-react';

type DoctorMedicalFormTabsProps = {
  activeFormId: DoctorMedicalFormId | null;
  activeModuleView: DoctorDetailView;
  onSelect: (formId: DoctorMedicalFormId) => void;
};

export function DoctorMedicalFormTabs({
  activeFormId,
  activeModuleView,
  onSelect,
}: DoctorMedicalFormTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {DOCTOR_MEDICAL_FORMS.map((form) => {
        const selected =
          activeFormId === form.id ||
          (form.moduleView != null &&
            activeFormId == null &&
            activeModuleView === form.moduleView);
        return (
          <Button
            key={form.id}
            type="button"
            size="sm"
            variant={selected ? 'default' : 'outline'}
            className={
              selected ?
                'h-auto min-h-8 max-w-full whitespace-normal rounded-xl bg-slate-800 px-3 py-1.5 text-left text-xs leading-snug hover:bg-slate-900'
              : 'h-auto min-h-8 max-w-full whitespace-normal rounded-xl border-slate-200 px-3 py-1.5 text-left text-xs leading-snug text-slate-700'
            }
            onClick={() => onSelect(form.id)}>
            {form.label}
          </Button>
        );
      })}
    </div>
  );
}

export function DoctorMedicalFormPanel({
  formId,
  patient,
  labCatalog = [],
  priceRows = [],
  saving = false,
  actorName = '',
  actorLogin = '',
  defaultDoctorUserId = null,
  inpatient = null,
  onSaveAdmissionExam,
  onSaveDutyDoctorExam,
  onSavePrimaryExam,
  onSaveJointExam,
  onSaveStageEpicrisis,
  onReferSpecialist,
  onSaveSelectedServiceResults,
}: {
  formId: DoctorMedicalFormId;
  patient: PatientRow;
  labCatalog?: LabCategory[];
  priceRows?: ServicePriceRow[];
  saving?: boolean;
  actorName?: string;
  actorLogin?: string;
  defaultDoctorUserId?: string | null;
  inpatient?: InpatientAdmission | null;
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
}) {
  if (formId === 'qabul-korigi' && onSaveAdmissionExam) {
    return (
      <PatientAdmissionExamPanel
        patient={patient}
        saving={saving}
        actorName={actorName}
        actorLogin={actorLogin}
        defaultDoctorUserId={defaultDoctorUserId}
        onSave={onSaveAdmissionExam}
      />
    );
  }

  if (formId === 'navbatchi-shifokor-korigi' && onSaveDutyDoctorExam) {
    return (
      <PatientDutyDoctorExamPanel
        patient={patient}
        saving={saving}
        defaultDoctorUserId={defaultDoctorUserId}
        onSave={onSaveDutyDoctorExam}
      />
    );
  }

  if (formId === 'birlamchi-tekshiruv' && onSavePrimaryExam) {
    return (
      <PatientPrimaryExamPanel
        patient={patient}
        saving={saving}
        defaultDoctorUserId={defaultDoctorUserId}
        onSave={onSavePrimaryExam}
      />
    );
  }

  if (formId === 'qoshma-korik' && onSaveJointExam) {
    return (
      <PatientJointExamPanel
        patient={patient}
        saving={saving}
        defaultDoctorUserId={defaultDoctorUserId}
        onSave={onSaveJointExam}
      />
    );
  }

  if (formId === 'bosqichli-epikriz' && onSaveStageEpicrisis) {
    return (
      <PatientStageEpicrisisPanel
        patient={patient}
        saving={saving}
        defaultDoctorUserId={defaultDoctorUserId}
        onSave={onSaveStageEpicrisis}
      />
    );
  }

  if (formId === 'statsionar-tekshiruv') {
    return <StatsionarTekshiruvSection patient={patient} inpatient={inpatient} />;
  }

  if (formId === 'tor-mutaxassis-konsultatsiyasi' && onReferSpecialist) {
    return (
      <PatientSpecialistReferralPanel
        patient={patient}
        saving={saving}
        onRefer={onReferSpecialist}
      />
    );
  }

  if (formId === 'barcha-epikrizlar') {
    return (
      <PatientAllEpicrisesPanel
        patient={patient}
        inpatient={inpatient}
        saving={saving}
        defaultDoctorUserId={defaultDoctorUserId}
        onSaveStageEpicrisis={onSaveStageEpicrisis}
        onReferSpecialist={onReferSpecialist}
      />
    );
  }

  if (formId === 'tibbiy-xizmat-natijalari' && onSaveSelectedServiceResults) {
    return (
      <PatientServiceResultsPanel
        patient={patient}
        labCatalog={labCatalog}
        priceRows={priceRows}
        saving={saving}
        onSaveSelected={onSaveSelectedServiceResults}
      />
    );
  }

  const form = findDoctorMedicalForm(formId);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <FileText className="size-5 shrink-0" />
        <h3 className="font-semibold">{form.label}</h3>
      </div>
      <p className="text-sm text-slate-600">
        Bemor: <span className="font-medium text-slate-900">{patient.fullName}</span>
        {patient.diseaseType ?
          <>
            {' '}
            · {patient.diseaseType}
          </>
        : null}
      </p>
      <p className="mt-3 text-sm text-slate-500">
        {form.label} shakli keyingi bosqichda to‘ldiriladi. Hozircha ushbu bo‘lim ochiq holatda
        saqlanadi.
      </p>
    </section>
  );
}
