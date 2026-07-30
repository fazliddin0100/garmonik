'use client';

import { APPOINTMENT_REQUESTS_CHANGED_EVENT } from '@/lib/appointment-requests/client-events';
import { useCallback, useEffect, useState } from 'react';

export function useNewOnlineQueueCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setCount(0);
      return;
    }
    try {
      const res = await fetch('/api/appointment-requests?newCountOnly=1', {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json()) as { newCount?: number };
      if (res.ok && typeof json.newCount === 'number') {
        setCount(json.newCount);
      }
    } catch {
      /* tarmoq xatosi — eski qiymat qoladi */
    }
  }, [enabled]);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(APPOINTMENT_REQUESTS_CHANGED_EVENT, onChange);
    const intervalId = window.setInterval(() => void load(), 60_000);
    return () => {
      window.removeEventListener(APPOINTMENT_REQUESTS_CHANGED_EVENT, onChange);
      window.clearInterval(intervalId);
    };
  }, [load]);

  return count;
}
