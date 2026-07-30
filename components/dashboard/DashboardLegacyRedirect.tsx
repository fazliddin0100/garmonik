'use client';

import { persistDashboardInitialView, type DashboardViewId } from '@/lib/dashboard/views';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLegacyRedirect({
  view,
}: {
  view: DashboardViewId;
}) {
  const router = useRouter();

  useEffect(() => {
    persistDashboardInitialView(view);
    router.replace('/dashboard');
  }, [router, view]);

  return (
    <p className="text-sm text-slate-500">Dashboard ochilmoqda…</p>
  );
}
