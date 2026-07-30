'use client';

import {
  consumeStaffPortalFocusPatient,
  consumeStaffPortalInitialView,
  isStaffPortalShellPath,
  persistStaffPortalFocusPatient,
  persistStaffPortalInitialView,
  staffPortalViewFromLegacyPath,
  STAFF_PORTAL_VIEW_META,
  type StaffPortalViewId,
} from '@/lib/staff-portal/views';
import type { StaffRole } from '@/lib/staff-portal/types';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type StaffPortalPatientsMode = 'doctor' | 'nurse' | 'laboratory' | 'specialist' | 'default';

type StaffPortalViewContextValue = {
  basePath: string;
  view: StaffPortalViewId;
  title: string;
  onShell: boolean;
  showPatientsNav: boolean;
  showServicesNav: boolean;
  showQueueNav: boolean;
  staffRole: StaffRole | null;
  patientsMode: StaffPortalPatientsMode;
  focusPatientId: string | undefined;
  openDiagnosisIntent: boolean;
  setView: (view: StaffPortalViewId) => void;
  openView: (view: StaffPortalViewId) => void;
  openPatients: (patientId?: string, openDiagnosis?: boolean) => void;
  clearPatientFocus: () => void;
};

const StaffPortalViewContext = createContext<StaffPortalViewContextValue | null>(
  null,
);

type StaffPortalViewProviderProps = {
  basePath: string;
  showPatientsNav?: boolean;
  showServicesNav?: boolean;
  showQueueNav?: boolean;
  defaultView?: StaffPortalViewId;
  staffRole?: StaffRole | null;
  patientsMode?: StaffPortalPatientsMode;
  children: ReactNode;
};

export function StaffPortalViewProvider({
  basePath,
  showPatientsNav = true,
  showServicesNav = true,
  showQueueNav = true,
  defaultView = 'home',
  staffRole = null,
  patientsMode = 'default',
  children,
}: StaffPortalViewProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const onShell = isStaffPortalShellPath(basePath, pathname);

  const [view, setViewState] = useState<StaffPortalViewId>(defaultView);
  const [focusPatientId, setFocusPatientId] = useState<string | undefined>();
  const [openDiagnosisIntent, setOpenDiagnosisIntent] = useState(false);

  useEffect(() => {
    if (!onShell) return;
    const fromPath = staffPortalViewFromLegacyPath(basePath, pathname);
    if (!fromPath) return;
    if (fromPath === 'home' && pathname === basePath && defaultView !== 'home') {
      setViewState(defaultView);
      return;
    }
    setViewState(fromPath);
  }, [basePath, pathname, onShell, defaultView]);

  useEffect(() => {
    if (!onShell) return;
    const initial = consumeStaffPortalInitialView();
    if (initial) setViewState(initial);
    const focus = consumeStaffPortalFocusPatient();
    if (focus.patientId) {
      setViewState('bemorlar');
      setFocusPatientId(focus.patientId);
      setOpenDiagnosisIntent(focus.openDiagnosis);
    }
  }, [onShell]);

  const setView = useCallback((next: StaffPortalViewId) => {
    setViewState(next);
    if (next !== 'bemorlar') {
      setFocusPatientId(undefined);
      setOpenDiagnosisIntent(false);
    }
  }, []);

  const openView = useCallback(
    (next: StaffPortalViewId) => {
      setView(next);
      if (pathname !== basePath) {
        router.push(basePath);
      }
    },
    [basePath, pathname, router, setView],
  );

  const openPatients = useCallback(
    (patientId?: string, openDiagnosis = false) => {
      if (patientId) {
        setFocusPatientId(patientId);
        setOpenDiagnosisIntent(openDiagnosis);
      }
      openView('bemorlar');
    },
    [openView],
  );

  const clearPatientFocus = useCallback(() => {
    setFocusPatientId(undefined);
    setOpenDiagnosisIntent(false);
  }, []);

  const title = STAFF_PORTAL_VIEW_META[view].title;

  const value = useMemo(
    () => ({
      basePath,
      view,
      title,
      onShell,
      showPatientsNav,
      showServicesNav,
      showQueueNav,
      staffRole,
      patientsMode,
      focusPatientId,
      openDiagnosisIntent,
      setView,
      openView,
      openPatients,
      clearPatientFocus,
    }),
    [
      basePath,
      view,
      title,
      onShell,
      showPatientsNav,
      showServicesNav,
      showQueueNav,
      staffRole,
      patientsMode,
      focusPatientId,
      openDiagnosisIntent,
      setView,
      openView,
      openPatients,
      clearPatientFocus,
    ],
  );

  return (
    <StaffPortalViewContext.Provider value={value}>
      {children}
    </StaffPortalViewContext.Provider>
  );
}

export function useStaffPortalView() {
  const ctx = useContext(StaffPortalViewContext);
  if (!ctx) {
    throw new Error('useStaffPortalView must be used within StaffPortalViewProvider');
  }
  return ctx;
}

export function useStaffPortalViewOptional() {
  return useContext(StaffPortalViewContext);
}

export { persistStaffPortalInitialView, persistStaffPortalFocusPatient };
