'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ClinicalPatientsPanel from '@/components/patients/ClinicalPatientsPanel';

function ClinicalWithQuery({
  mode,
  focusPatientId: focusProp,
  openDiagnosisIntent: diagnosisProp,
}: {
  mode: 'doctor' | 'nurse' | 'laboratory';
  focusPatientId?: string;
  openDiagnosisIntent?: boolean;
}) {
  const sp = useSearchParams();
  const patientFromUrl = sp.get('patient')?.trim() || undefined;
  const diagnosisFromUrl = sp.get('tashxis') === '1';
  const focusPatientId = focusProp ?? patientFromUrl;
  const openDiagnosisIntent = diagnosisProp ?? diagnosisFromUrl;
  return (
    <ClinicalPatientsPanel
      mode={mode}
      focusPatientId={focusPatientId}
    />
  );
}

export default function ClinicalPatientsRouteView({
  mode,
  focusPatientId,
  openDiagnosisIntent,
}: {
  mode: 'doctor' | 'nurse' | 'laboratory';
  focusPatientId?: string;
  openDiagnosisIntent?: boolean;
}) {
  if (focusPatientId !== undefined || openDiagnosisIntent !== undefined) {
    return (
      <ClinicalPatientsPanel
        mode={mode}
        focusPatientId={focusPatientId}
      />
    );
  }
  return (
    <Suspense fallback={<ClinicalPatientsPanel mode={mode} />}>
      <ClinicalWithQuery mode={mode} />
    </Suspense>
  );
}
