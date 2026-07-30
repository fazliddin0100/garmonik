export type StaffPortalViewId =
  | 'home'
  | 'bemorlar'
  | 'navbat'
  | 'xizmatlar'
  | 'kartalar'
  | 'hisobotlar';

export const STAFF_PORTAL_INITIAL_VIEW_KEY = 'garmonik-staff-portal-initial-view';
export const STAFF_PORTAL_FOCUS_PATIENT_KEY = 'garmonik-staff-portal-focus-patient';
export const STAFF_PORTAL_OPEN_DIAGNOSIS_KEY = 'garmonik-staff-portal-open-diagnosis';

export type StaffPortalViewMeta = {
  title: string;
  segment: string;
};

export const STAFF_PORTAL_VIEW_META: Record<StaffPortalViewId, StaffPortalViewMeta> =
  {
    home: { title: 'Bosh sahifa', segment: '' },
    bemorlar: { title: 'Bemorlar', segment: 'bemorlar' },
    navbat: { title: 'Navbat', segment: 'navbat' },
    xizmatlar: { title: 'Xizmatlar', segment: 'xizmatlar' },
    kartalar: { title: 'Kartalar', segment: 'kartalar' },
    hisobotlar: { title: 'Hisobotlar', segment: 'hisobotlar' },
  };

export function staffPortalLegacyPath(
  basePath: string,
  view: StaffPortalViewId,
): string {
  const seg = STAFF_PORTAL_VIEW_META[view].segment;
  return seg ? `${basePath}/${seg}` : basePath;
}

export function isStaffPortalShellPath(
  basePath: string,
  pathname: string,
): boolean {
  if (pathname === basePath) return true;
  return Object.values(STAFF_PORTAL_VIEW_META).some((m) => {
    if (!m.segment) return false;
    const legacy = `${basePath}/${m.segment}`;
    return pathname === legacy || pathname.startsWith(`${legacy}/`);
  });
}

export function staffPortalViewFromLegacyPath(
  basePath: string,
  pathname: string,
): StaffPortalViewId | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ?
      pathname.slice(0, -1)
    : pathname;
  if (normalized === basePath) return 'home';
  for (const [view, meta] of Object.entries(STAFF_PORTAL_VIEW_META) as [
    StaffPortalViewId,
    StaffPortalViewMeta,
  ][]) {
    if (!meta.segment) continue;
    const legacy = `${basePath}/${meta.segment}`;
    if (normalized === legacy || normalized.startsWith(`${legacy}/`)) {
      return view;
    }
  }
  return null;
}

export function isStaffPortalViewId(value: string): value is StaffPortalViewId {
  return value in STAFF_PORTAL_VIEW_META;
}

export function persistStaffPortalInitialView(view: StaffPortalViewId) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STAFF_PORTAL_INITIAL_VIEW_KEY, view);
}

export function consumeStaffPortalInitialView(): StaffPortalViewId | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(STAFF_PORTAL_INITIAL_VIEW_KEY);
  sessionStorage.removeItem(STAFF_PORTAL_INITIAL_VIEW_KEY);
  if (!raw || !isStaffPortalViewId(raw)) return null;
  return raw;
}

export function persistStaffPortalFocusPatient(
  patientId: string,
  openDiagnosis = false,
) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STAFF_PORTAL_FOCUS_PATIENT_KEY, patientId);
  if (openDiagnosis) {
    sessionStorage.setItem(STAFF_PORTAL_OPEN_DIAGNOSIS_KEY, '1');
  } else {
    sessionStorage.removeItem(STAFF_PORTAL_OPEN_DIAGNOSIS_KEY);
  }
}

export function consumeStaffPortalFocusPatient(): {
  patientId: string | null;
  openDiagnosis: boolean;
} {
  if (typeof window === 'undefined') {
    return { patientId: null, openDiagnosis: false };
  }
  const patientId = sessionStorage.getItem(STAFF_PORTAL_FOCUS_PATIENT_KEY);
  sessionStorage.removeItem(STAFF_PORTAL_FOCUS_PATIENT_KEY);
  const openDiagnosis =
    sessionStorage.getItem(STAFF_PORTAL_OPEN_DIAGNOSIS_KEY) === '1';
  sessionStorage.removeItem(STAFF_PORTAL_OPEN_DIAGNOSIS_KEY);
  return {
    patientId: patientId?.trim() || null,
    openDiagnosis,
  };
}
