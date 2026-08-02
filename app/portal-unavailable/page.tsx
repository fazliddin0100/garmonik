'use client';

import RoleAwareUserMenu from '@/components/auth/RoleAwareUserMenu';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PortalUnavailablePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [roleLabel, setRoleLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        });
        const me = (await res.json()) as {
          kind?: string;
          roleLabel?: string;
          fullName?: string;
        };
        if (cancelled) return;
        if (me?.kind !== 'admin' && me?.kind !== 'staff') {
          router.replace('/auth/login?next=/portal-unavailable');
          return;
        }
        setRoleLabel(
          typeof me.roleLabel === 'string' && me.roleLabel.trim() ?
            me.roleLabel.trim()
          : '',
        );
        setReady(true);
      } catch {
        if (!cancelled) router.replace('/auth/login?next=/portal-unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Yuklanmoqda…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-rose-50/40">
      <header className="flex items-center justify-end border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur">
        <RoleAwareUserMenu />
      </header>
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
          <FileQuestion className="size-8" />
        </span>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-rose-600/80">
          404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Sahifa mavjud emas
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {roleLabel ?
            <>
              «{roleLabel}» roli uchun alohida kabinet hali yaratilmagan.
              Administrator bilan bog‘laning yoki boshqa hisobdan kiring.
            </>
          : <>
              Sizning rolingiz uchun alohida kabinet hali yaratilmagan.
              Administrator bilan bog‘laning.
            </>
          }
        </p>
        <Button asChild variant="outline" className="mt-8 rounded-xl">
          <Link href="/auth/login">Kirish sahifasi</Link>
        </Button>
      </main>
    </div>
  );
}
