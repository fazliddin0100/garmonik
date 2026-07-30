'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type HeadNurseViewId =
  | 'home'
  | 'yotqizish'
  | 'statsionar'
  | 'kuzatuv'
  | 'xonalar';

const VIEW_TITLES: Record<HeadNurseViewId, string> = {
  home: 'Bosh sahifa',
  yotqizish: 'Yotqizish',
  statsionar: 'Statsionar bemorlar',
  kuzatuv: 'Uyga kuzatuv',
  xonalar: 'Xonalar',
};

type HeadNurseViewContextValue = {
  view: HeadNurseViewId;
  title: string;
  setView: (view: HeadNurseViewId) => void;
  focusAdmissionId: string | null;
  openAdmission: (id?: string) => void;
};

const HeadNurseViewContext = createContext<HeadNurseViewContextValue | null>(null);

export function HeadNurseViewProvider({
  defaultView = 'home',
  children,
}: {
  defaultView?: HeadNurseViewId;
  children: ReactNode;
}) {
  const [view, setViewState] = useState<HeadNurseViewId>(defaultView);
  const [focusAdmissionId, setFocusAdmissionId] = useState<string | null>(null);

  const setView = useCallback((next: HeadNurseViewId) => {
    setViewState(next);
    if (next !== 'statsionar' && next !== 'kuzatuv') {
      setFocusAdmissionId(null);
    }
  }, []);

  const openAdmission = useCallback((id?: string) => {
    if (id) setFocusAdmissionId(id);
    setViewState(id ? 'statsionar' : 'statsionar');
  }, []);

  const value = useMemo(
    () => ({
      view,
      title: VIEW_TITLES[view],
      setView,
      focusAdmissionId,
      openAdmission,
    }),
    [view, setView, focusAdmissionId, openAdmission],
  );

  return (
    <HeadNurseViewContext.Provider value={value}>{children}</HeadNurseViewContext.Provider>
  );
}

export function useHeadNurseView() {
  const ctx = useContext(HeadNurseViewContext);
  if (!ctx) throw new Error('useHeadNurseView must be used within HeadNurseViewProvider');
  return ctx;
}

export { VIEW_TITLES };
