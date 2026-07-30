'use client';

import { persistStaffPortalInitialView } from '@/lib/staff-portal/views';
import type { StaffPortalViewId } from '@/lib/staff-portal/views';
import { useStaffPortalView } from '@/components/staff/StaffPortalViewContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StaffPortalLegacyRedirect({
  view,
}: {
  view: StaffPortalViewId;
}) {
  const router = useRouter();
  const { basePath } = useStaffPortalView();

  useEffect(() => {
    persistStaffPortalInitialView(view);
    router.replace(basePath);
  }, [basePath, router, view]);

  return <p className="text-sm text-slate-500">Kabinet ochilmoqda…</p>;
}
