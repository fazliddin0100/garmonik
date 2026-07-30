'use client';

import { persistPortalInitialSection } from '@/lib/portal/sections';
import { persistUsersInitialView, type UsersViewId } from '@/lib/users/views';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersLegacyRedirect({ view }: { view: UsersViewId }) {
  const router = useRouter();

  useEffect(() => {
    persistPortalInitialSection('users');
    persistUsersInitialView(view);
    router.replace('/users');
  }, [router, view]);

  return <p className="text-sm text-slate-500">Xodimlar bo‘limi ochilmoqda…</p>;
}
