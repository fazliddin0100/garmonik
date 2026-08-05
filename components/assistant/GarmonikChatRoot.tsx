'use client';

import GarmonikChatWidget from '@/components/assistant/GarmonikChatWidget';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const HIDDEN_PREFIXES = [
  '/auth',
  '/ariza',
  '/portal-unavailable',
  '/kassa/login',
];

function isAuthHiddenPath(pathname: string): boolean {
  return HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export default function GarmonikChatRoot() {
  const pathname = usePathname();
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (cancelled) return;
        const data = (await res.json().catch(() => null)) as {
          kind?: string;
        } | null;
        // /api/auth/me sessiya yo‘q bo‘lsa ham 200 + { kind: 'none' } qaytaradi
        setAuthed(Boolean(data?.kind && data.kind !== 'none'));
      } catch {
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!checked || !authed || isAuthHiddenPath(pathname)) return null;

  return <GarmonikChatWidget />;
}
