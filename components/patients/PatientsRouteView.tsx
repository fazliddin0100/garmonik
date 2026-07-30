'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PatientsPanel from '@/components/patients/PatientsPanel';

function PatientsWithQuery() {
  const sp = useSearchParams();
  const patient = sp.get('patient')?.trim() || undefined;
  const openDiagnosisIntent = sp.get('tashxis') === '1';
  return <PatientsPanel focusPatientId={patient} openDiagnosisIntent={openDiagnosisIntent} />;
}

export default function PatientsRouteView({
  focusPatientId: focusProp,
  openDiagnosisIntent: diagnosisProp,
}: {
  focusPatientId?: string;
  openDiagnosisIntent?: boolean;
} = {}) {
  if (focusProp !== undefined || diagnosisProp !== undefined) {
    return (
      <PatientsPanel
        focusPatientId={focusProp}
        openDiagnosisIntent={diagnosisProp}
      />
    );
  }
  return (
    <Suspense fallback={<PatientsPanel />}>
      <PatientsWithQuery />
    </Suspense>
  );
}
