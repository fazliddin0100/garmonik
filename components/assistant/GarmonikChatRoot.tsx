'use client';

import GarmonikChatWidget from '@/components/assistant/GarmonikChatWidget';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const HIDDEN_PREFIXES = ['/auth', '/ariza', '/portal-unavailable'];

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
        setAuthed(res.ok);
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

  if (!checked || !authed) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return <GarmonikChatWidget />;
}
