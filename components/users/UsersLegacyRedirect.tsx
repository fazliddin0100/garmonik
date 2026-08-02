'use client';

import { usersViewPath, type UsersViewId } from '@/lib/users/views';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersLegacyRedirect({ view }: { view: UsersViewId }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(usersViewPath(view));
  }, [router, view]);

  return <p className="text-sm text-slate-500">Xodimlar bo‘limi ochilmoqda…</p>;
}
