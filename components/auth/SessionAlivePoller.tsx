'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** Mongo bilan sessiya mosligini tekshirish intervali (ms) */
const INTERVAL_MS = 30_000;

type MeJson = {
  kind?: string;
  invalidated?: boolean;
};

export default function SessionAlivePoller() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as MeJson;
        if (cancelled) return;
        if (data?.kind !== 'none' || data?.invalidated !== true) return;
        const p = pathRef.current ?? '';
        if (p.startsWith('/auth')) return;
        if (p.startsWith('/kassa')) return;
        router.replace('/auth/login?reason=session');
        router.refresh();
      } catch {
        /* tarmoq vaqtincha */
      }
    }

    void tick();
    const id = setInterval(tick, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [router]);

  return null;
}
