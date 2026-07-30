'use client';

import ClinicalPatientsRouteView from '@/components/patients/ClinicalPatientsRouteView';
import PatientsRouteView from '@/components/patients/PatientsRouteView';
import QueueLivePanel from '@/components/queue/QueueLivePanel';
import LaboratoryQueuePanel from '@/components/queue/LaboratoryQueuePanel';
import DoctorReportsPanel from '@/components/reports/DoctorReportsPanel';
import LaboratoryReportsPanel from '@/components/reports/LaboratoryReportsPanel';
import ReportsFinancialPanel from '@/components/reports/ReportsFinancialPanel';
import ServicesPricingCatalog from '@/components/services/ServicesPricingCatalog';
import SpecialistPatientsPanel from '@/components/patients/SpecialistPatientsPanel';
import StaffRoleDashboard from '@/components/staff/StaffRoleDashboard';
import { useStaffPortalView } from '@/components/staff/StaffPortalViewContext';
import type { StaffRole } from '@/lib/staff-portal/types';
import { useEffect, useState } from 'react';

const INTRO: Partial<Record<StaffRole, string>> = {
  doctor:
    'Bemorlar kartotekasi, jonli navbat va hisobotlar — barchasi shifokor kabinetidan.',
  shifokor:
    'Bemorlar kartotekasi, jonli navbat va hisobotlar — barchasi shifokor kabinetidan.',
  laboratory:
    'Kassa to‘lovi qilingan bemorlar va tahlil natijalarini kiritish.',
  nurse:
    'Protseduralar, navbat va bemorlar bilan ishlash. Shifokorlar bilan bir xil modullarga cheklangan kabinet orqali kirish.',
  head_nurse:
    'Protseduralar, navbat va bemorlar bilan ishlash. Bosh hamshira kabineti.',
  specialist:
    'Shifokor yo\'naltirgan bemorlarni tekshiring va konsultatsiya natijasini kiriting.',
};

export default function StaffPortalWorkspace() {
  const {
    view,
    basePath,
    showPatientsNav,
    showServicesNav,
    showQueueNav,
    staffRole,
    patientsMode,
    focusPatientId,
    openDiagnosisIntent,
    openPatients,
  } = useStaffPortalView();

  const [role, setRole] = useState<StaffRole>(staffRole ?? 'shifokor');

  useEffect(() => {
    if (staffRole) {
      setRole(staffRole);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const me = await res.json();
        if (cancelled) return;
        if (me?.kind === 'staff' && typeof me.role === 'string') {
          setRole(me.role as StaffRole);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [staffRole]);

  const isLab = role === 'laboratory';

  switch (view) {
    case 'home':
      return (
        <StaffRoleDashboard
          role={role}
          intro={INTRO[role] ?? 'Xodim kabineti'}
        />
      );
    case 'bemorlar':
      if (!showPatientsNav) return null;
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {patientsMode === 'doctor' ?
              'Bemorlar bazasi — tavsiya, tashxis, tahlillar, dorilar va to‘liq tibbiy tarix modullari orqali'
            : patientsMode === 'laboratory' ?
              'To‘langan bemorlar — natijalar kiritilgach ro‘yxatdan chiqadi'
            : patientsMode === 'nurse' ?
              'Bemorlar — tahlil natijalarini kiritish'
            : patientsMode === 'specialist' ?
              'Sizga yo\'naltirilgan bemorlar — tekshiruv natijasini kiriting'
            : 'Bemorlar (tahlil buyurtmalari bilan bog‘liq)'}
          </p>
          {patientsMode === 'doctor' ?
            <ClinicalPatientsRouteView
              mode="doctor"
              focusPatientId={focusPatientId}
              openDiagnosisIntent={openDiagnosisIntent}
            />
          : patientsMode === 'specialist' ?
            <SpecialistPatientsPanel focusPatientId={focusPatientId} />
          : patientsMode === 'nurse' || patientsMode === 'laboratory' ?
            <ClinicalPatientsRouteView
              mode={patientsMode === 'laboratory' ? 'laboratory' : 'nurse'}
              focusPatientId={focusPatientId}
            />
          : <PatientsRouteView
              focusPatientId={focusPatientId}
              openDiagnosisIntent={openDiagnosisIntent}
            />}
        </div>
      );
    case 'navbat':
      if (!showQueueNav) {
        return null;
      }
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {isLab ? 'To\'langan bemorlar navbati' : 'Jonli navbat'}
          </p>
          {isLab ?
            <LaboratoryQueuePanel
              onOpenPatient={(patientId) => openPatients(patientId)}
            />
          : <QueueLivePanel
              assignedDoctorQueueOnly={patientsMode === 'doctor'}
              onOpenPatients={(patientId, openDiagnosis) =>
                openPatients(patientId, openDiagnosis)
              }
            />
          }
        </div>
      );
    case 'xizmatlar':
      if (!showServicesNav) return null;
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {isLab ? 'Tahlillar narxlari' : 'Xizmatlar va narxlar katalogi'}
          </p>
          <ServicesPricingCatalog />
        </div>
      );
    case 'hisobotlar':
      return (
        <div className="space-y-4">
          {patientsMode === 'doctor' ?
            <>
              <p className="text-sm text-slate-500">
                Siz qabul qilgan bemorlar va belgilangan tahlillar bo‘yicha hisobot
              </p>
              <DoctorReportsPanel />
            </>
          : patientsMode === 'laboratory' ?
            <>
              <p className="text-sm text-slate-500">
                Siz kiritgan laboratoriya natijalari bo‘yicha qisqa hisobot
              </p>
              <LaboratoryReportsPanel />
            </>
          : <>
              <p className="text-sm text-slate-500">Moliyaviy va operatsion hisobotlar</p>
              <ReportsFinancialPanel />
            </>
          }
        </div>
      );
    default:
      return null;
  }
}
